<?php
namespace AI_SEO_Publisher;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * دانلود خودکار، فشرده‌سازی و بارگذاری ایمن تصاویر شاخص سئو شده به رسانه وردپرس
 */
class Image_Handler {

    /**
     * سایدلود و تگ‌گذاری تصاویر شاخص مقاله با هوش مصنوعی
     */
    public static function upload_featured_image($post_id, $image_source_url, $alt_text, $title_text) {
        if (!is_numeric($post_id) || empty($image_source_url)) {
            return false;
        }

        // بررسی تابع برای انجام سایدلود
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/media.php');

        // دانلود موقت فایل به سرور وردپرس
        $temp_file = download_url($image_source_url);
        if (is_wp_error($temp_file)) {
            DB::add_log('دانلود تصویر', 'خطا در دانلود فایل موقت تصویر: ' . $temp_file->get_error_message(), 'error');
            return false;
        }

        $file_array = array(
            'name'     => sanitize_title($title_text) . '.jpg',
            'tmp_name' => $temp_file
        );

        // آپلود مستقیم به دیتابیس کتابخانه چندرسانه‌ای وردپرس با دور زدن محدودیت‌های امنیتی سطح فایل
        $attachment_id = media_handle_sideload($file_array, $post_id);

        if (is_wp_error($attachment_id)) {
            @unlink($temp_file);
            DB::add_log('رسانه وردپرس', 'خطا در ثبت تصویر در مدیا لایبرری: ' . $attachment_id->get_error_message(), 'error');
            return false;
        }

        // بهینه‌سازی و اضافه کردن فراداده‌های ارزشمند سئو به تصویر
        self::optimize_and_tag_image($attachment_id, $alt_text, $title_text);

        // انتساب تصویر شاخص به نوشته (Featured Image)
        set_post_thumbnail($post_id, $attachment_id);

        DB::add_log('تصویر شاخص', sprintf('تصویر شاخص جدید با شناسه رسانه %d به مقاله متصل و فراداده‌های سئو روی آن ست شدند.', $attachment_id), 'success');
        return $attachment_id;
    }

    /**
     * تنظیم تگ Alt، عنوان، کپشن و بهینه‌سازی فشرده‌سازی تصویر
     */
    private static function optimize_and_tag_image($attachment_id, $alt_text, $title_text) {
        // ۱. قرار دادن تگ ALT برای تصویر
        update_post_meta($attachment_id, '_wp_attachment_image_alt', sanitize_text_field($alt_text));

        // ۲. قرار دادن نام و توضیحات تصویر در نوشته رسانه
        wp_update_post(array(
            'ID'           => $attachment_id,
            'post_title'   => sanitize_text_field($title_text),
            'post_excerpt' => sanitize_text_field($alt_text), // کپشن تصویر
            'post_content' => sanitize_text_field('راهنمای تفصیلی تولید شده پیرامون موضوع ' . $title_text) // توضیحات تصویر
        ));

        // ۳. فشرده‌سازی تصویر و تبدیل به قالب مدرن WebP اگر سرور ابزار لازم را داشته باشد
        self::convert_to_webp($attachment_id);
    }

    /**
     * شبیه‌سازی یا پردازش واقعی تبدیل تصاویر به قالب سبک WebP با کلاس WP_Image_Editor
     */
    private static function convert_to_webp($attachment_id) {
        $file_path = get_attached_file($attachment_id);
        if (!$file_path || !file_exists($file_path)) {
            return;
        }

        $editor = wp_get_image_editor($file_path);
        if (!is_wp_error($editor)) {
            $info = pathinfo($file_path);
            $webp_path = $info['dirname'] . '/' . $info['filename'] . '.webp';
            
            // ذخیره فایل با فرمت WebP
            $saved = $editor->save($webp_path, 'image/webp');
            if (!is_wp_error($saved)) {
                // بروزرسانی فراداده‌های وردپرس با نام تصویر فشرده جدید
                update_attached_file($attachment_id, $webp_path);
                @unlink($file_path); // پاک کردن فایل JPG قدیمی برای صرفه‌جویی در هارد سرور
            }
        }
    }
}
