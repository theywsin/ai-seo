<?php
namespace AI_SEO_Publisher;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * مدیریت کنترل‌کننده زمان‌بندی هوشمند، صف محتوایی و تریگرهای دوره ای WP-Cron
 */
class Scheduler {

    /**
     * اجرای دوره ای توسط کرون‌جاب وردپرس
     */
    public static function trigger_auto_publish_event() {
        global $wpdb;
        $table_keywords = $wpdb->prefix . 'ai_seo_keywords';

        // واکشی اولین کلمه کلیدی صف بر اساس اولویت بالا (High -> Medium -> Low)
        $query = "SELECT * FROM $table_keywords 
                  WHERE status = 'queued' 
                  ORDER BY FIELD(priority, 'high', 'medium', 'low') ASC, id ASC 
                  LIMIT 1";
                  
        $keyword_row = $wpdb->get_row($query, ARRAY_A);

        if (!$keyword_row) {
            DB::add_log('کرون صف محتوا', 'هیچ کلمه کلیدی در صف برای تولید مقاله وجود ندارد.', 'warning');
            return false;
        }

        $keyword  = $keyword_row['keyword'];
        $category = $keyword_row['category'];
        $id       = $keyword_row['id'];

        DB::add_log('فرآیند خودکار سازی', sprintf('پردازش خودکار کلمه کلیدی "%s" آغاز شد.', $keyword), 'success');

        // ۱. فعال‌سازی موتور تولید محتوای هوشمند
        $options = array(
            'tone'       => get_option('ai_seo_content_tone', 'آموزشی و بی طرف'),
            'word_count' => intval(get_option('ai_seo_target_words', 1800))
        );

        $article_result = Generator::generate_article($keyword, $category, $options);

        if (is_wp_error($article_result)) {
            // آپدیت وضعیت کلمه به حالت شکست خورده کلاستر
            $wpdb->update(
                $table_keywords,
                array('status' => 'failed'),
                array('id' => $id)
            );
            DB::add_log('موتور هوش مصنوعی', 'خطا در گام خودکارسازی مقاله: ' . $article_result->get_error_message(), 'error');
            return false;
        }

        // ۲. ساخت نوشته فیزیکی جدید در وردپرس
        $post_status = get_option('ai_seo_default_post_status', 'publish'); // publish / draft
        $post_data = array(
            'post_title'   => wp_strip_all_tags($article_result['title']),
            'post_name'    => sanitize_title($article_result['slug']),
            'post_content' => $article_result['htmlContent'],
            'post_status'  => $post_status,
            'post_author'  => 1,
            'post_category' => array(self::get_or_create_wp_category($category))
        );

        $post_id = wp_insert_post($post_data);

        if (is_wp_error($post_id) || $post_id === 0) {
            $wpdb->update($table_keywords, array('status' => 'failed'), array('id' => $id));
            DB::add_log('داشبورد وردپرس', 'خطا در ثبت فیزیکی مقاله در دیتابیس پست‌ها', 'error');
            return false;
        }

        // ۳. دانلود و انتساب تصویر شاخص سئو شده (Featured Image) با فرمت سبک WebP
        $image_api_url = "https://picsum.photos/1200/800"; // پیش‌فرض یا آدرس گالری عکاسی تحت لایسنس آزاد
        Image_Handler::upload_featured_image($post_id, $image_api_url, $article_result['imageAltText'], $article_result['title']);

        // ۴. لینک‌سازی داخلی هوشمند و بازنویسی کد نوشته
        $updated_content = Interlinker::build_internal_links($post_id, $article_result['htmlContent']);
        wp_update_post(array(
            'ID'           => $post_id,
            'post_content' => $updated_content
        ));

        // ۵. تزریق و سئو کامل متاهای Yoast SEO و سبز کردن چراغ‌های مرتبط
        Yoast_Integrator::set_yoast_metadata($post_id, $article_result);

        // ۶. بروزرسانی نهایی جدول کلمات کلیدی
        $wpdb->update(
            $table_keywords,
            array(
                'status'           => 'completed',
                'used_in_post_id' => $post_id
            ),
            array('id' => $id)
        );

        DB::add_log('فرآیند انتشار', sprintf('مقاله هوشمند "%s" با موفقیت منتشر و فرآیند زمان‌بندی آن تکمیل شد.', $article_result['title']), 'success');
        return $post_id;
    }

    /**
     * پیدا کردن یا ساخت دسته‌بندی وردپرس مبتنی بر ورودی
     */
    private static function get_or_create_wp_category($category_name) {
        $category_id = get_cat_ID($category_name);
        if ($category_id === 0) {
            $new_cat = wp_create_category($category_name);
            if (!is_wp_error($new_cat)) {
                return $new_cat;
            }
            return 1; // دسته‌بندی پیش‌فرض
        }
        return $category_id;
    }
}
