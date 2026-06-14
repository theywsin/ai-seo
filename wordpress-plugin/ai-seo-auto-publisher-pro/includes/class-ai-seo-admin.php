<?php
namespace AI_SEO_Publisher;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * کلاس مدیریت پنل ادمین و مسیرهای REST API وردپرس همراه با احراز هویت
 */
class Admin {

    protected $namespace = 'ai-seo-publisher/v1';

    /**
     * ثبت مسیرهای REST API افزونه برای برقراری ارتباط با اپلیکیشن ری‌اکت
     */
    public function register_routes() {
        // ۱. دریافت کلمات کلیدی، افزودن و حذف
        register_rest_route($this->namespace, '/keywords', array(
            array(
                'methods'             => \WP_REST_Server::READABLE,
                'callback'            => array($this, 'get_keywords_route'),
                'permission_callback' => array('AI_SEO_Publisher\Security', 'check_admin_capabilities')
            ),
            array(
                'methods'             => \WP_REST_Server::CREATABLE,
                'callback'            => array($this, 'add_keyword_route'),
                'permission_callback' => array('AI_SEO_Publisher\Security', 'check_admin_capabilities')
            )
        ));

        register_rest_route($this->namespace, '/keywords/(?P<id>\d+)', array(
            'methods'             => \WP_REST_Server::DELETABLE,
            'callback'            => array($this, 'delete_keyword_route'),
            'permission_callback' => array('AI_SEO_Publisher\Security', 'check_admin_capabilities')
        ));

        // ۲. تریگر دستی تولید مقاله برای کلمه کلیدی خاص
        register_rest_route($this->namespace, '/generate', array(
            'methods'             => \WP_REST_Server::CREATABLE,
            'callback'            => array($this, 'generate_now_route'),
            'permission_callback' => array('AI_SEO_Publisher\Security', 'check_admin_capabilities')
        ));

        // ۳. ذخیره و دریافت تنظیمات افزونه
        register_rest_route($this->namespace, '/settings', array(
            array(
                'methods'             => \WP_REST_Server::READABLE,
                'callback'            => array($this, 'get_settings_route'),
                'permission_callback' => array('AI_SEO_Publisher\Security', 'check_admin_capabilities')
            ),
            array(
                'methods'             => \WP_REST_Server::CREATABLE,
                'callback'            => array($this, 'save_settings_route'),
                'permission_callback' => array('AI_SEO_Publisher\Security', 'check_admin_capabilities')
            )
        ));

        // ۴. دریافت گزارشها و آمارهای کلیدی سئو
        register_rest_route($this->namespace, '/stats', array(
            'methods'             => \WP_REST_Server::READABLE,
            'callback'            => array($this, 'get_stats_route'),
            'permission_callback' => array('AI_SEO_Publisher\Security', 'check_admin_capabilities')
        ));
    }

    /**
     * روت: واکشی کلمات کلیدی
     */
    public function get_keywords_route($request) {
        $keywords = DB::get_keywords(100, 0);
        return new \WP_REST_Response($keywords, 200);
    }

    /**
     * روت: افزودن کلمه کلیدی جدید
     */
    public function add_keyword_route($request) {
        $params   = Security::sanitize_input_data($request->get_json_params());
        $keyword  = isset($params['keyword']) ? trim($params['keyword']) : '';
        $category = isset($params['category']) ? trim($params['category']) : 'عمومی';
        $priority = isset($params['priority']) ? trim($params['priority']) : 'medium';
        $cluster  = isset($params['cluster']) ? trim($params['cluster']) : 'خوشه اصلی';

        if (empty($keyword)) {
            return new \WP_Error('empty_keyword', __('کلمه کلیسی نمی‌تواند خالی باشد.', 'ai-seo-auto-publisher'), array('status' => 400));
        }

        $res = DB::insert_keyword($keyword, $category, $priority, $cluster);

        if (is_wp_error($res)) {
            return $res;
        }

        return new \WP_REST_Response(array(
            'success' => true,
            'id'      => $res,
            'message' => __('کلمه کلیدی جدید ثبت و به صف زمان‌بندی اضافه شد.', 'ai-seo-auto-publisher')
        ), 200);
    }

    /**
     * روت: حذف کلمه کلیدی
     */
    public function delete_keyword_route($request) {
        global $wpdb;
        $id = intval($request['id']);
        $table = $wpdb->prefix . 'ai_seo_keywords';

        $deleted = $wpdb->delete($table, array('id' => $id), array('%d'));

        if ($deleted) {
            return new \WP_REST_Response(array('success' => true, 'message' => __('کلمه کلیدی حذف شد.', 'ai-seo-auto-publisher')), 200);
        }

        return new \WP_Error('delete_failed', __('حذف کلمه کلیدی با خطا مواجه شد.', 'ai-seo-auto-publisher'), array('status' => 400));
    }

    /**
     * روت: تولید آنی مقاله بر اساس کلمه کلیدی ثبت شده
     */
    public function generate_now_route($request) {
        $params   = Security::sanitize_input_data($request->get_json_params());
        $keyword  = isset($params['keyword']) ? trim($params['keyword']) : '';
        $category = isset($params['category']) ? trim($params['category']) : 'عمومی';

        if (empty($keyword)) {
            return new \WP_Error('empty_keyword', __('کلمه اصلی یافت نشد.', 'ai-seo-auto-publisher'), array('status' => 400));
        }

        // شبیه‌سازی مراحل سئو خودکار ترتیبی
        $options = array(
            'tone'       => get_option('ai_seo_content_tone', 'حرفه‌ای و علمی'),
            'word_count' => intval(get_option('ai_seo_target_words', 2000))
        );

        $article = Generator::generate_article($keyword, $category, $options);

        if (is_wp_error($article)) {
            return $article;
        }

        // ۱. ایجاد پست پیش‌نویس یا منتشر شده
        $post_data = array(
            'post_title'   => wp_strip_all_tags($article['title']),
            'post_name'    => sanitize_title($article['slug']),
            'post_content' => $article['htmlContent'],
            'post_status'  => 'draft', // دستی همیشه به صورت پیش‌نویس ذخیره می‌شود جهت بازبینی مدیر
            'post_author'  => get_current_user_id(),
            'post_category'=> array(wp_create_category($category))
        );

        $post_id = wp_insert_post($post_data);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        // ۲. آپلود تصویر شاخص
        $image_url = "https://picsum.photos/1200/800"; // آدرس تصویر شبیه‌سازی مناسب
        Image_Handler::upload_featured_image($post_id, $image_url, $article['imageAltText'], $article['title']);

        // ۳. لینک‌سازی داخلی هوشمند
        $updated_content = Interlinker::build_internal_links($post_id, $article['htmlContent']);
        wp_update_post(array(
            'ID'           => $post_id,
            'post_content' => $updated_content
        ));

        // ۴. برچسب‌گذاری کامل Yoast SEO
        Yoast_Integrator::set_yoast_metadata($post_id, $article);

        return new \WP_REST_Response(array(
            'success'   => true,
            'post_id'   => $post_id,
            'permalink' => get_permalink($post_id),
            'article'   => $article
        ), 200);
    }

    /**
     * روت: دریافت تنظیمات پلاگین
     */
    public function get_settings_route($request) {
        return new \WP_REST_Response(array(
            'api_provider'        => get_option('ai_seo_api_provider', 'gemini'),
            'api_key'             => get_option('ai_seo_api_key', ''),
            'model_name'          => get_option('ai_seo_model_name', 'gemini-3.5-flash'),
            'content_tone'        => get_option('ai_seo_content_tone', 'آموزشی و روان'),
            'target_words'        => get_option('ai_seo_target_words', 1800),
            'default_post_status' => get_option('ai_seo_default_post_status', 'draft'),
            'publish_interval'    => get_option('ai_seo_publish_interval', 'daily'),
        ), 200);
    }

    /**
     * روت: ذخیره تنظیمات امن افزونه
     */
    public function save_settings_route($request) {
        $params = Security::sanitize_input_data($request->get_json_params());

        update_option('ai_seo_api_provider', sanitize_text_field($params['api_provider']));
        update_option('ai_seo_api_key', sanitize_text_field($params['api_key']));
        update_option('ai_seo_model_name', sanitize_text_field($params['model_name']));
        update_option('ai_seo_content_tone', sanitize_text_field($params['content_tone']));
        update_option('ai_seo_target_words', intval($params['target_words']));
        update_option('ai_seo_default_post_status', sanitize_text_field($params['default_post_status']));
        update_option('ai_seo_publish_interval', sanitize_text_field($params['publish_interval']));

        DB::add_log('تنظیمات امنیتی', 'تنظیمات پیکربندی هوش مصنوعی و سئو با موفقیت به‌روزرسانی شد.', 'success');

        return new \WP_REST_Response(array('success' => true, 'message' => __('تنظیمات با موفقیت ذخیره شدند.', 'ai-seo-auto-publisher')), 200);
    }

    /**
     * روت: دریافت آمارها و ارقام تحلیلی داشبورد
     */
    public function get_stats_route($request) {
        global $wpdb;
        $table_keywords = $wpdb->prefix . 'ai_seo_keywords';
        $table_logs = $wpdb->prefix . 'ai_seo_logs';

        $total_keywords     = $wpdb->get_var("SELECT COUNT(*) FROM $table_keywords");
        $completed_keywords = $wpdb->get_var("SELECT COUNT(*) FROM $table_keywords WHERE status = 'completed'");
        $queued_keywords    = $wpdb->get_var("SELECT COUNT(*) FROM $table_keywords WHERE status = 'queued'");
        $failed_keywords    = $wpdb->get_var("SELECT COUNT(*) FROM $table_keywords WHERE status = 'failed'");

        $logs = $wpdb->get_results("SELECT * FROM $table_logs ORDER BY id DESC LIMIT 15", ARRAY_A);

        return new \WP_REST_Response(array(
            'totalKeywords'     => intval($total_keywords),
            'completedKeywords'   => intval($completed_keywords),
            'queuedKeywords'    => intval($queued_keywords),
            'failedKeywords'    => intval($failed_keywords),
            'logs'              => $logs
        ), 200);
    }
}
