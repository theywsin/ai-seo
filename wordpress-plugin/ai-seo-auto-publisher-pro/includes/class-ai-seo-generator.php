<?php
namespace AI_SEO_Publisher;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * کلاس یکپارچه‌ساز تولید محتوا با هوش مصنوعی (Google Gemini & OpenAI)
 */
class Generator {

    /**
     * ارسال درخواست به موتورهای هوش مصنوعی
     */
    public static function generate_article($keyword, $category, $options = array()) {
        $api_provider = get_option('ai_seo_api_provider', 'gemini'); // gemini / openai
        $api_key      = get_option('ai_seo_api_key', '');
        $model        = get_option('ai_seo_model_name', 'gemini-3.5-flash');

        if (empty($api_key)) {
            DB::add_log('عدم پیکربندی', 'کلید API هوش مصنوعی در بخش تنظیمات افزونه خالی است.', 'error');
            return new \WP_Error('missing_api_key', __('کلید API یافت نشد. لطفاً در بخش تنظیمات آن را وارد کنید.', 'ai-seo-auto-publisher'));
        }

        $prompt = self::build_structured_prompt($keyword, $category, $options);

        if ($api_provider === 'gemini') {
            return self::call_gemini_api($api_key, $model, $prompt);
        } else {
            return self::call_openai_api($api_key, $model, $prompt);
        }
    }

    /**
     * ساخت پرامپت حرفه‌ای و بسیار دقیق برای سئو معنایی (Semantic SEO)
     */
    private static function build_structured_prompt($keyword, $category, $options) {
        $tone = isset($options['tone']) ? $options['tone'] : 'آموزشی و معتبر';
        $min_words = isset($options['word_count']) ? $options['word_count'] : 1500;

        return "شما یک متخصص برجسته سئو فارسی، بازاریاب محتوایی حرفه‌ای و مهندس هوش مصنوعی هستید.
        من برای کلمه کلیدی اصلی: \"$keyword\" در دسته‌بندی موضوعی: \"$category\" به یک مقاله جامع و مرجع نیاز دارم.

        معیارهای الزامی نگارش:
        - طول مقاله: حداقل $min_words تا 4000 کلمه به زبان فارسی شمرده و علمی.
        - لحن نگارش: $tone.
        - سئو همه‌جانبه: ساخت کلاستر موضوعی، بهینه‌سازی NLP، استفاده فراوان و توزیع‌شده از کلمات کلیدی هم‌معنی و LSI.
        - استفاده از جداول مقایسه‌ای کاربردی، تگ‌های Heading با سطوح مختلف (h2, h3, h4)، بخش مقدمه فریبنده، نتیجه‌گیری و فراخوانی برای اقدام (Call To Action).
        
        شما باید پاسخ خود را منحصراً در قالب و فایل ساختاریافته معتبر JSON زیر بازگردانید تا سیستم وبلاگ خودکار ما بدون خطا آن را Parse کند:
        {
            \"title\": \"عنوان جذاب، ترغیب‌کننده و سئو شده شامل کلمه کلیدی اصلی\",
            \"slug\": \"نامک غیراسپم، مثلاً سئو-وردپرس-هوش-مصنوعی (فقط کلمات کلیدی انگلیسی یا فارسی با خط تیره)\",
            \"metaDescription\": \"توضیحات کوتاه سئو Yoast حداکثر ۱۵۵ کاراکتر بسیار ترغیب‌کننده با کلمه کلیدی اصلی\",
            \"focusKeyphrase\": \"$keyword\",
            \"imageAltText\": \"متن جایگزین بسیار توصیف‌کننده و سئو شده برای تصویر اصلی مقاله\",
            \"htmlContent\": \"کدهای بدنه مقاله در قالب HTML معتبر با رعایت سلسه‌مراتب هدینگ‌ها، جداول، تگ p و نقل‌قول بدون تگ‌های کلیشه ای و تگ body و html\",
            \"faqs\": [
                {
                    \"question\": \"سوال متداول پرجستجو درباره این موضوع\",
                    \"answer\": \"پاسخ علمی، کوتاه و قانع‌کننده سئو برای این سوال\"
                }
            ],
            \"schema\": {
                \"@context\": \"https://schema.org\",
                \"@type\": \"Article\",
                \"headline\": \"عنوان تولید شده\"
            }
        }

        نکته بسیار مهم: پاسخ شما باید صرفاً رشته معتبر JSON باشد. هیچ کاراکتر اضافی قبل یا بعد از آکولادها تولید نکنید.";
    }

    /**
     * فراخوانی سرور Google Gemini API
     */
    private static function call_gemini_api($api_key, $model, $prompt) {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . $api_key;

        $body = array(
            'contents' => array(
                array(
                    'parts' => array(
                        array('text' => $prompt)
                    )
                )
            ),
            'generationConfig' => array(
                'responseMimeType' => 'application/json'
            )
        );

        $response = wp_remote_post($url, array(
            'headers'     => array('Content-Type' => 'application/json'),
            'body'        => wp_json_encode($body),
            'timeout'     => 120, // درخواست محتواهای طولانی زمانبر است
            'redirection' => 5,
            'blocking'    => true
        ));

        if (is_wp_error($response)) {
            return $response;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            $err_msg = wp_remote_retrieve_body($response);
            return new \WP_Error('gemini_api_error', sprintf('کد خطای سرویس جینی: %d - اطلاعات: %s', $response_code, $err_msg));
        }

        $res_body = wp_remote_retrieve_body($response);
        $data = json_decode($res_body, true);

        if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
            $json_str = trim($data['candidates'][0]['content']['parts'][0]['text']);
            $parsed = json_decode($json_str, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $parsed;
            }
            return new \WP_Error('json_parse_error', 'هوش مصنوعی خروجی غیر استاندارد برگرداند.');
        }

        return new \WP_Error('invalid_ai_response', 'ساختار خروجی بازگشتی معتبر نبود.');
    }

    /**
     * فراخوانی سرور OpenAI API شرکت هوش مصنوعی
     */
    private static function call_openai_api($api_key, $model, $prompt) {
        $url = "https://api.openai.com/v1/chat/completions";

        $body = array(
            'model' => $model,
            'messages' => array(
                array(
                    'role'    => 'user',
                    'content' => $prompt
                )
            ),
            'response_format' => array('type' => 'json_object'),
            'temperature'     => 0.7
        );

        $response = wp_remote_post($url, array(
            'headers' => array(
                'Content-Type'  => 'application/json',
                'Authorization' => 'Bearer ' . $api_key
            ),
            'body'    => wp_json_encode($body),
            'timeout' => 120
        ));

        if (is_wp_error($response)) {
            return $response;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            return new \WP_Error('openai_api_error', 'خطا در برقراری ارتباط با صادرکننده کلید OpenAI');
        }

        $res_body = wp_remote_retrieve_body($response);
        $data = json_decode($res_body, true);

        if (isset($data['choices'][0]['message']['content'])) {
            $json_str = trim($data['choices'][0]['message']['content']);
            $parsed = json_decode($json_str, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $parsed;
            }
        }

        return new \WP_Error('json_parse_error', 'خروجی دریافتی جی‌سان غیراستاندارد بود.');
    }
}
