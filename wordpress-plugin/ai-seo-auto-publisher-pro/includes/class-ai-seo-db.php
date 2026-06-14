<?php
namespace AI_SEO_Publisher;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * کلاس مدیریت دیتابیس جداول اختصاصی سئو و کلمات کلیدی
 */
class DB {

    /**
     * اجرای دستور ساخت جداول در فعال‌سازی افزونه
     */
    public static function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        // 1. جدول مدیریت جامع کلمات کلیدی، اولویت‌ها و خوشه‌های موضوعی
        $table_keywords = $wpdb->prefix . 'ai_seo_keywords';
        $sql_keywords = "CREATE TABLE $table_keywords (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            keyword varchar(255) NOT NULL,
            category varchar(100) DEFAULT 'عمومی' NOT NULL,
            priority enum('low', 'medium', 'high') DEFAULT 'medium' NOT NULL,
            cluster varchar(150) DEFAULT 'بدون خوشه' NOT NULL,
            status enum('queued', 'completed', 'failed') DEFAULT 'queued' NOT NULL,
            used_in_post_id bigint(20) DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY keyword_unique (keyword)
        ) $charset_collate;";

        // 2. جدول ثبت رویدادها، تریگرهای کرون و کارهای انجام شده هوش مصنوعی
        $table_logs = $wpdb->prefix . 'ai_seo_logs';
        $sql_logs = "CREATE TABLE $table_logs (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            action varchar(100) NOT NULL,
            message text NOT NULL,
            status enum('success', 'error', 'warning') DEFAULT 'success' NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY  (id)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql_keywords);
        dbDelta($sql_logs);
    }

    /**
     * افزودن لاگ امن سیستم
     */
    public static function add_log($action, $message, $status = 'success') {
        global $wpdb;
        $table = $wpdb->prefix . 'ai_seo_logs';

        $wpdb->insert(
            $table,
            array(
                'action'     => sanitize_text_field($action),
                'message'    => wp_kses_post($message),
                'status'     => sanitize_text_field($status),
                'created_at' => current_time('mysql')
            ),
            array('%s', '%s', '%s', '%s')
        );
    }

    /**
     * دریافت لیست کلمات کلیدی ثبت شده با مرتب‌سازی امن آماده شده
     */
    public static function get_keywords($limit = 100, $offset = 0) {
        global $wpdb;
        $table = $wpdb->prefix . 'ai_seo_keywords';
        
        $query = $wpdb->prepare(
            "SELECT * FROM $table ORDER BY id DESC LIMIT %d OFFSET %d",
            $limit,
            $offset
        );
        
        return $wpdb->get_results($query, ARRAY_A);
    }

    /**
     * ثبت کلمه کلیدی با جلوگیری از تزریق SQL
     */
    public static function insert_keyword($keyword, $category, $priority, $cluster) {
        global $wpdb;
        $table = $wpdb->prefix . 'ai_seo_keywords';

        // بررسی تکراری نبودن
        $exists = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table WHERE keyword = %s", $keyword));
        if ($exists) {
            return new \WP_Error('duplicate_keyword', __('این کلمه کلیدی قبلاً اضافه شده است.', 'ai-seo-auto-publisher'));
        }

        $result = $wpdb->insert(
            $table,
            array(
                'keyword'  => sanitize_text_field($keyword),
                'category' => sanitize_text_field($category),
                'priority' => sanitize_text_field($priority),
                'cluster'  => sanitize_text_field($cluster),
                'status'   => 'queued'
            ),
            array('%s', '%s', '%s', '%s')
        );

        if ($result) {
            self::add_log('ثبت کلمه کلیدی', sprintf('کلمه کلیدی جدید "%s" ثبت شد.', $keyword), 'success');
            return $wpdb->insert_id;
        }

        return false;
    }
}
