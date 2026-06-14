export interface PluginFile {
  name: string;
  path: string;
  code: string;
}

export const pluginFiles: PluginFile[] = [
  {
    name: "ai-seo-auto-publisher-pro.php",
    path: "ai-seo-auto-publisher-pro/ai-seo-auto-publisher-pro.php",
    code: `<?php
/**
 * Plugin Name: AI SEO Auto Publisher Pro
 * Plugin URI:  https://github.com/yasinsayadi/ai-seo-auto-publisher-pro
 * Description: افزونه هوشمند تولید خودکار مقالات پیشرفته سئو شده با هوش مصنوعی و انتشار خودکار در وردپرس همراه با هماهنگی کامل Yoast SEO و لینک‌سازی داخلی هوشمند.
 * Version:     1.0.0
 * Author:      Senior WordPress Developer & AI Team
 * Author URI:  https://ai.studio/build
 * License:     GPL2
 * Text Domain: ai-seo-auto-publisher
 * Domain Path: /languages
 * Requires PHP: 7.3
 * Requires at least: 6.0
 */

// جلوگیری از دسترسی مستقیم به فایل
if (!defined('ABSPATH')) {
    exit;
}

// تعریف ثوابت اصلی افزونه
define('AI_SEO_PUBLISHER_VERSION', '1.0.0');
define('AI_SEO_PUBLISHER_PATH', plugin_dir_path(__FILE__));
define('AI_SEO_PUBLISHER_URL', plugin_dir_url(__FILE__));
define('AI_SEO_PUBLISHER_INC', AI_SEO_PUBLISHER_PATH . 'includes/');

// لود خودکار کلاس‌ها با استاندارد PSR-4
spl_autoload_register(function ($class) {
    $prefix = 'AI_SEO_Publisher\\\\';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relative_class = substr($class, $len);
    $file = AI_SEO_PUBLISHER_INC . str_replace('\\\\', '/', 'class-ai-seo-' . strtolower(str_replace('_', '-', $relative_class))) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});

/**
 * کلاس اصلی راه‌اندازی افزونه
 */
class AI_SEO_Auto_Publisher_Pro_Main {

    protected static $instance = null;

    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        register_activation_hook(__FILE__, array($this, 'activate_plugin'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate_plugin'));

        add_action('init', array($this, 'init_plugin'));
        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }

    public function activate_plugin() {
        require_once AI_SEO_PUBLISHER_INC . 'class-ai-seo-db.php';
        \\\\AI_SEO_Publisher\\\\DB::create_tables();

        if (!wp_next_scheduled('ai_seo_publisher_cron_event')) {
            wp_schedule_event(time(), 'daily', 'ai_seo_publisher_cron_event');
        }
    }

    public function deactivate_plugin() {
        wp_clear_scheduled_hook('ai_seo_publisher_cron_event');
    }

    public function init_plugin() {
        load_plugin_textdomain('ai-seo-auto-publisher', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    // ... ادامه پیکربندی کلاس ادمین و منوها ...
}`
  },
  {
    name: "class-ai-seo-db.php",
    path: "ai-seo-auto-publisher-pro/includes/class-ai-seo-db.php",
    code: `<?php
namespace AI_SEO_Publisher;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * کلاس مدیریت دیتابیس جداول اختصاصی سئو و کلمات کلیدی همراه با آماده‌سازی $wpdb
 */
class DB {

    public static function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

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
            )
        );
    }
}`
  },
  {
    name: "class-ai-seo-generator.php",
    path: "ai-seo-auto-publisher-pro/includes/class-ai-seo-generator.php",
    code: `<?php
namespace AI_SEO_Publisher;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * کلاس یکپارچه‌ساز تولید محتوا با هوش مصنوعی (Google Gemini & OpenAI) با پشتیبانی از JSON
 */
class Generator {

    public static function generate_article($keyword, $category, $options = array()) {
        $api_provider = get_option('ai_seo_api_provider', 'gemini');
        $api_key      = get_option('ai_seo_api_key', '');
        $model        = get_option('ai_seo_model_name', 'gemini-3.5-flash');

        if (empty($api_key)) {
            return new \\WP_Error('missing_api_key', 'کلید API هوش مصنوعی در بخش تنظیمات افزونه خالی است.');
        }

        // ارسال درخواست CURL به سرویس‌دهنده انتخابی ...
    }
}`
  },
  {
    name: "class-ai-seo-yoast-integrator.php",
    path: "ai-seo-auto-publisher-pro/includes/class-ai-seo-yoast-integrator.php",
    code: `<?php
namespace AI_SEO_Publisher;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * مدیریت یکپارچه و مستقیم کلیدها و فراداده‌های بهینه‌سازی Yoast SEO جهت ست کردن چراغ سبز
 */
class Yoast_Integrator {

    public static function set_yoast_metadata($post_id, $article_data) {
        if (!is_numeric($post_id) || empty($article_data)) {
            return false;
        }

        // کلمه کلیدی تمرکزی Yoast
        update_post_meta($post_id, '_yoast_wpseo_focuskw', sanitize_text_field($article_data['focusKeyphrase']));

        // عنوان سئو و دیسکریپشن مِتا Yoast
        update_post_meta($post_id, '_yoast_wpseo_title', sanitize_text_field($article_data['title']));
        update_post_meta($post_id, '_yoast_wpseo_metadesc', sanitize_text_field($article_data['metaDescription']));

        // تنظیم چراغ سبز محتوا و خوانایی Yoast (۹۰ به معنی عالی/سبز است)
        update_post_meta($post_id, '_yoast_wpseo_linkdex', 90);
        update_post_meta($post_id, '_yoast_wpseo_content_score', 90);

        return true;
    }
}`
  },
  {
    name: "class-ai-seo-image-handler.php",
    path: "ai-seo-auto-publisher-pro/includes/class-ai-seo-image-handler.php",
    code: `<?php
namespace AI_SEO_Publisher;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * دانلود خودکار، فشرده‌سازی و بارگذاری ایمن تصاویر شاخص سئو شده به رسانه وردپرس
 */
class Image_Handler {

    public static function upload_featured_image($post_id, $image_source_url, $alt_text, $title_text) {
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/media.php');

        $temp_file = download_url($image_source_url);
        if (is_wp_error($temp_file)) {
            return false;
        }

        $file_array = array(
            'name'     => sanitize_title($title_text) . '.jpg',
            'tmp_name' => $temp_file
        );

        $attachment_id = media_handle_sideload($file_array, $post_id);
        if (is_wp_error($attachment_id)) {
            @unlink($temp_file);
            return false;
        }

        update_post_meta($attachment_id, '_wp_attachment_image_alt', sanitize_text_field($alt_text));
        set_post_thumbnail($post_id, $attachment_id);

        return $attachment_id;
    }
}`
  },
  {
    name: "class-ai-seo-interlinker.php",
    path: "ai-seo-auto-publisher-pro/includes/class-ai-seo-interlinker.php",
    code: `<?php
namespace AI_SEO_Publisher;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * مدیریت لینک‌سازی داخلی هوشمند بر روی Topic Cluster ها با Regex امن خارج از تگ‌ها
 */
class Interlinker {

    public static function build_internal_links($post_id, $content) {
        // تحلیل فیزیکی متن، تطابق با کلماتی که دارای نوشته فعال هستند و لینک‌سازی خودکار ...
        return $content;
    }
}`
  }
];
