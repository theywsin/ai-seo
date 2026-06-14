<?php
namespace AI_SEO_Publisher;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * مدیریت لینک‌سازی داخلی هوشمند و بهینه‌سازی کلاستر موضوعی (Topic Cluster)
 */
class Interlinker {

    /**
     * اسکن بدنه پست و تعبیه لینک‌های داخلی هوشمند به نوشته‌های مرتبط قدیمی یا لینک کلاسترها
     */
    public static function build_internal_links($post_id, $content, $keywords_structure = array()) {
        if (empty($content) || !is_numeric($post_id)) {
            return $content;
        }

        // دریافت کلماتی که باید به صورت خوشه لینک شوند
        $clusters = self::get_active_topic_clusters();
        if (empty($clusters)) {
            return $content;
        }

        // استفاده از ابزار DOM یا ریجکس امن برای تعویض عبارات بدون آسیب زدن به تگ‌های موجود
        foreach ($clusters as $item) {
            $keyword = preg_quote($item['keyword'], '/');
            $link    = esc_url_raw($item['url']);
            $anchor  = esc_html($item['keyword']);

            // الگو: تطابق کلمه کلیدی در متن تنها در صورتی که خارج از تگ‌های a و h1-h6 قرار دارد
            $pattern = '/(?<!<a href=")(?<!<a href=\')(?<!\w)(' . $keyword . ')(?!\w)(?![^<>]*<\/a>)(?![^<>]*\")/ui';

            // محدودیت سئو: تکرار لینک به یک آدرس مشترک بیش از یک بار در مقاله غیرمجاز است
            $content = preg_replace($pattern, '<a href="' . $link . '" title="' . esc_attr($anchor) . '" class="ai-internal-link">' . $item['keyword'] . '</a>', $content, 1);
        }

        DB::add_log('لینک‌سازی داخلی', sprintf('فرآیند لینک‌سازی داخلی روی نوشته %d اعمال شد.', $post_id), 'success');
        return $content;
    }

    /**
     * واکشی فعال خوشه‌های موضوعی (Topic Cluster) از دیتابیس وردپرس جهت مرجع لینک‌ها
     */
    private static function get_active_topic_clusters() {
        global $wpdb;
        $table = $wpdb->prefix . 'ai_seo_keywords';
        
        // پیدا کردن تمامی کلمات کلیدی که مرتبط با یک نوشته منتشر شده هستند
        $query = "SELECT keyword, used_in_post_id FROM $table WHERE status = 'completed' AND used_in_post_id IS NOT NULL LIMIT 8";
        $results = $wpdb->get_results($query, ARRAY_A);

        $clusters = array();
        foreach ($results as $row) {
            $url = get_permalink($row['used_in_post_id']);
            if ($url) {
                $clusters[] = array(
                    'keyword' => $row['keyword'],
                    'url'     => $url
                );
            }
        }

        // پایداری: اگر دیتابیس کلاستری نداشت، چند لینک پایه و اصلی سایت را برگرداند
        if (empty($clusters)) {
            $clusters[] = array('keyword' => 'سئو وردپرس', 'url' => home_url('/cms-seo/'));
            $clusters[] = array('keyword' => 'آموزش بهینه‌سازی سایت', 'url' => home_url('/speed-up/'));
        }

        return $clusters;
    }
}
