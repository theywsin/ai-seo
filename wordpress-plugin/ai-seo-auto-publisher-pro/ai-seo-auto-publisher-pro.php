<?php
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
    $prefix = 'AI_SEO_Publisher\\';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relative_class = substr($class, $len);
    $file = AI_SEO_PUBLISHER_INC . str_replace('\\', '/', 'class-ai-seo-' . strtolower(str_replace('_', '-', $relative_class))) . '.php';

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
        // فعال‌سازی و راه‌اندازی دیتابیس جداول سفارشی
        register_activation_hook(__FILE__, array($this, 'activate_plugin'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate_plugin'));

        // قلاب‌های اصلی وردپرس
        add_action('init', array($this, 'init_plugin'));
        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));

        // ثبت مسیرهای REST API وردپرس برای ری‌اکت
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }

    /**
     * فعال‌سازی افزونه و ساخت جدول کلمات کلیدی، صف و لاگ
     */
    public function activate_plugin() {
        require_once AI_SEO_PUBLISHER_INC . 'class-ai-seo-db.php';
        \AI_SEO_Publisher\DB::create_tables();

        // ثبت کرون‌جاب وردپرس
        if (!wp_next_scheduled('ai_seo_publisher_cron_event')) {
            wp_schedule_event(time(), 'daily', 'ai_seo_publisher_cron_event');
        }
    }

    /**
     * غیرفعال‌سازی افزونه و پاک کردن کرون‌جاب‌ها
     */
    public function deactivate_plugin() {
        wp_clear_scheduled_hook('ai_seo_publisher_cron_event');
    }

    public function init_plugin() {
        // بارگذاری ترجمه افزونه
        load_plugin_textdomain('ai-seo-auto-publisher', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    /**
     * افزودن آیتم منو به پیشخوان وردپرس
     */
    public function register_admin_menu() {
        add_menu_page(
            'AI SEO Publisher',
            'سئو خودکار هوشمند Pro',
            'manage_options',
            'ai-seo-auto-publisher',
            array($this, 'render_admin_dashboard'),
            'dashicons-superhero',
            15
        );
    }

    /**
     * لود کردن استایل‌ها و اسکریپت‌های پنل ادمین (نسخه ری‌اکت)
     */
    public function enqueue_admin_assets($hook) {
        if ($hook !== 'toplevel_page_ai-seo-auto-publisher') {
            return;
        }

        // انکیو کردن فایل کدهای باندل شده React
        wp_enqueue_style('ai-seo-admin-styles', AI_SEO_PUBLISHER_URL . 'assets/css/admin.css', array(), AI_SEO_PUBLISHER_VERSION);
        wp_enqueue_script('ai-seo-admin-js', AI_SEO_PUBLISHER_URL . 'assets/js/admin.js', array('jquery', 'wp-api'), AI_SEO_PUBLISHER_VERSION, true);

        // ارسال مقادیر امنیتی Nonce به بخش جاوااسکریپت
        wp_localize_script('ai-seo-admin-js', 'aiSeoSettings', array(
            'root'  => esc_url_raw(rest_url('ai-seo-publisher/v1')),
            'nonce' => wp_create_nonce('wp_rest')
        ));
    }

    /**
     * رندر صفحه داشبورد ادمین وردپرس
     */
    public function render_admin_dashboard() {
        echo '<div id="ai-seo-app-root"></div>';
    }

    /**
     * رجیستر کردن روت‌های REST API برای برقراری ارتباط با پکیج React
     */
    public function register_rest_routes() {
        require_once AI_SEO_PUBLISHER_INC . 'class-ai-seo-security.php';
        require_once AI_SEO_PUBLISHER_INC . 'class-ai-seo-admin.php';

        $admin_controller = new \AI_SEO_Publisher\Admin();
        $admin_controller->register_routes();
    }
}

// صدا زدن کلاس برای شروع به کار
add_action('plugins_loaded', function () {
    AI_SEO_Auto_Publisher_Pro_Main::get_instance();
});
