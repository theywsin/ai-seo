<?php
namespace AI_SEO_Publisher;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * مدیریت امنیت افزونه، شامل بررسی صلاحیت‌ها، تأیید Nonceها، اعتبارسنجی‌ها و بهینه‌سازی کدهای ارسالی
 */
class Security {

    /**
     * بررسی صلاحیت کاربر وارد شده برای تغییرات پیشرفته سئو (تنها برای مدیران ارشد مجاز است)
     */
    public static function check_admin_capabilities() {
        if (!current_user_can('manage_options')) {
            return new \WP_Error(
                'rest_forbidden',
                __('شما صلاحیت امنیتی برای انجام این تغییرات سئو را ندارید.', 'ai-seo-auto-publisher'),
                array('status' => 403)
            );
        }
        return true;
    }

    /**
     * بررسی صحت فیلدهای هدر در وب‌سرویس‌ها جهت جلوگیری از حملات CSRF
     */
    public static function verify_rest_nonce($request) {
        $nonce = $request->get_header('X-WP-Nonce');
        if (!wp_verify_nonce($nonce, 'wp_rest')) {
            return new \WP_Error(
                'rest_cookie_invalid_nonce',
                __('توکن امنیتی نانز منقضی شده یا نامعتبر است.', 'ai-seo-auto-publisher'),
                array('status' => 403)
            );
        }
        return true;
    }

    /**
     * پاک‌سازی و ضدعفونی کردن عمیق آرایه‌های ورودی و کلمات برای محافظت در برابر آسیب‌پذیری‌های XSS
     */
    public static function sanitize_input_data($data) {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                $data[$key] = self::sanitize_input_data($value);
            }
        } else {
            $data = sanitize_text_field($data);
        }
        return $data;
    }
}
