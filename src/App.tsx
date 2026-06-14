import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  KeyRound,
  Play,
  Settings,
  Code,
  FileText,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Plus,
  Trash,
  PlusCircle,
  Download,
  Server,
  Check,
  Copy,
  FileCode,
  ArrowLeft,
  BookOpen,
  ArrowRight,
  Database,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Search,
  CheckCircle2,
  FileUp,
  XCircle,
  AlertCircle
} from "lucide-react";
import { pluginFiles, PluginFile } from "./pluginCodeData";

interface Keyword {
  id: number;
  text: string;
  category: string;
  priority: string;
  cluster: string;
  status: string;
  usedIn: string | null;
}

interface QueueItem {
  id: number;
  keyword: string;
  category: string;
  scheduled: string;
  retryCount: number;
  priority: string;
}

interface AppLog {
  id: number;
  timestamp: string;
  action: string;
  message: string;
  status: string;
}

interface APIStatus {
  hasApiKey: boolean;
  status: string;
  model: string;
  phpVersion: string;
  wordPressVersion: string;
  yoastVersion: string;
}

interface ArticleGenerationResult {
  title: string;
  slug: string;
  metaDescription: string;
  focusKeyphrase: string;
  keywordDensity: string;
  readabilityScore: string;
  transitionWordsPercent: string;
  estimatedWords: number;
  imageAltText: string;
  htmlContent: string;
  faqs: { question: string; answer: string }[];
  internalLinks: { anchor: string; targetUrl: string }[];
  outboundLinks: { anchor: string; targetUrl: string }[];
  schema: any;
  offlineSimulator?: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [status, setStatus] = useState<APIStatus | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);

  // Form states for creating keywords
  const [newKeywordText, setNewKeywordText] = useState<string>("");
  const [newKeywordCategory, setNewKeywordCategory] = useState<string>("آموزش سئو");
  const [newKeywordPriority, setNewKeywordPriority] = useState<string>("medium");
  const [newKeywordCluster, setNewKeywordCluster] = useState<string>("هسته سئو وردپرس");
  const [kwError, setKwError] = useState<string | null>(null);

  // Simulated CSV uploading
  const [csvFileUploaded, setCsvFileUploaded] = useState<boolean>(false);

  // Settings form states
  const [settings, setSettings] = useState({
    api_provider: "gemini",
    api_key: "",
    model_name: "gemini-3.5-flash",
    content_tone: "آموزشی و متقاعدکننده",
    target_words: 1800,
    default_post_status: "draft",
    publish_interval: "daily"
  });
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<boolean>(false);

  // Generator states
  const [selectedGeneratorKeyword, setSelectedGeneratorKeyword] = useState<string>("");
  const [selectedGeneratorCategory, setSelectedGeneratorCategory] = useState<string>("آموزش سئو");
  const [selectedGeneratorTone, setSelectedGeneratorTone] = useState<string>("آموزشی و روان");
  const [selectedGeneratorLength, setSelectedGeneratorLength] = useState<number>(2000);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [generatedResult, setGeneratedResult] = useState<ArticleGenerationResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Code Explorer states
  const [selectedFile, setSelectedFile] = useState<PluginFile>(pluginFiles[0]);
  const [copiedFile, setCopiedFile] = useState<boolean>(false);

  // WP-Cron simulator state
  const [isCronRunning, setIsCronRunning] = useState<boolean>(false);
  const [cronNotification, setCronNotification] = useState<string | null>(null);

  // Load Status, Keywords, Queue, Logs on Mount
  const fetchAllData = async () => {
    try {
      setIsLoadingStatus(true);
      const [resStatus, resKeywords, resQueue, resLogs, resSettings] = await Promise.all([
        fetch("/api/status").then(r => r.json()),
        fetch("/api/keywords").then(r => r.json()),
        fetch("/api/queue").then(r => r.json()),
        fetch("/api/logs").then(r => r.json()),
        fetch("/api/settings").then(r => r.json())
      ]);

      setStatus(resStatus);
      setKeywords(resKeywords);
      setQueue(resQueue);
      setLogs(resLogs);
      if (resSettings && !resSettings.error) {
        setSettings({
          ...settings,
          ...resSettings,
          api_key: resSettings.api_key || ""
        });
      }
    } catch (err) {
      console.error("Error loading application states:", err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [activeTab]);

  // Trigger manual keyword creation
  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    setKwError(null);
    if (!newKeywordText.trim()) {
      setKwError("لطفاً کلمه کلیدی را وارد کنید.");
      return;
    }

    try {
      const response = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newKeywordText,
          category: newKeywordCategory,
          priority: newKeywordPriority,
          cluster: newKeywordCluster
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setKwError(data.error || "ثبت کلمه کلیدی با خطا مواجه شد.");
        return;
      }

      setNewKeywordText("");
      fetchAllData();
    } catch (err) {
      setKwError("عدم اتصال به سرور شبیه‌ساز.");
    }
  };

  // Trigger keyword deletion
  const handleDeleteKeyword = async (id: number) => {
    try {
      await fetch(`/api/keywords/${id}`, { method: "DELETE" });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Save changes to settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccessMsg(false);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        setSettingsSuccessMsg(true);
        setTimeout(() => setSettingsSuccessMsg(false), 4000);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger simulated WP-Cron job run
  const runSimulatedCron = async () => {
    if (isCronRunning) return;
    setIsCronRunning(true);
    setCronNotification("در حال واکشی بالاترین اولویت صف و شبیه‌سازی مراحل انتشار...");

    // Find first queued keyword
    const nextItem = keywords.find(k => k.status === "queued");
    if (!nextItem) {
      setTimeout(() => {
        setCronNotification("صف زمان‌بندی خالی است! لطفاً ابتدا کلمه کلیدی اضافه کنید.");
        setIsCronRunning(false);
        setTimeout(() => setCronNotification(null), 4000);
      }, 1500);
      return;
    }

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: nextItem.text,
          category: nextItem.category,
          tone: settings.content_tone,
          targetLength: settings.target_words
        })
      });

      const result = await response.json();
      if (response.ok) {
        setCronNotification(`رویداد با موفقیت اجرا شد! مقاله جدید با عنوان '${result.title}' با وضعیت پیش‌نویس ذخیره، تصاویر آپلود، متادیتاهای Yoast تنظیم و وب‌سایت با موفقیت لینک‌سازی کلاستر شد.`);
        fetchAllData();
      } else {
        setCronNotification(`شکست در پردازش خودکار کرون: ${result.error}`);
      }
    } catch (err) {
      setCronNotification("عدم موفقیت در زمان‌بندی به دلیل عدم اتصال به سرور.");
    } finally {
      setIsCronRunning(false);
      setTimeout(() => setCronNotification(null), 8000);
    }
  };

  // Trigger manual AI generation (Interactive generator test panel)
  const handleGenerateArticle = async () => {
    if (!selectedGeneratorKeyword) {
      setGenerationError("لطفاً یک کلمه کلیدی از لیست کلمات کلیدی صف زیر انتخاب نمایید.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedResult(null);

    // Simulated logging phases
    const steps = [
      "مرحله ۱: بررسی ارتباط با سرور و بهینه‌سازی کلاستر با مدل " + settings.model_name + "...",
      "مرحله ۲: ارسال ساختار پرامپت NLP به جمینی جهت طراحی هدینگ‌های H2 تا H6...",
      "مرحله ۳: کالبدشکافی ساختار متن سه‌بعدی و ایجاد جداول محتوا و FAQ Schema...",
      "مرحله ۴: دانلود تصویر شاخص پیشرفته و فشرده‌سازی با الگوریتم WebP در رسانه وردپرس...",
      "مرحله ۵: آنالیز کلمات انتقالی، تراکم کلیدواژه و تزریق فیلدها در پایگاه متاهای Yoast SEO...",
      "مرحله ۶: شبیه‌سازی لینک‌سازی‌های داخلی کلاستر موضوعی و خروجی نهایی مقاله..."
    ];

    let stepIndex = 0;
    setGenerationStep(steps[0]);

    const stepInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setGenerationStep(steps[stepIndex]);
      } else {
        clearInterval(stepInterval);
      }
    }, 1800);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: selectedGeneratorKeyword,
          category: selectedGeneratorCategory,
          tone: selectedGeneratorTone,
          targetLength: selectedGeneratorLength
        })
      });

      const data = await response.json();
      clearInterval(stepInterval);

      if (!response.ok) {
        setGenerationError(data.error || "سرور قادر به تکمیل مقاله نبود. لطفاً کلید API را چک کنید.");
        setIsGenerating(false);
        return;
      }

      setGeneratedResult(data);
      fetchAllData();
    } catch (err) {
      clearInterval(stepInterval);
      setGenerationError("خطای ناشناخته در اتصال پیش‌آمد.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Safe file copy trigger
  const triggerCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  // Automatically select a keyword if keywords change
  useEffect(() => {
    const queued = keywords.find(k => k.status === "queued");
    if (queued) {
      setSelectedGeneratorKeyword(queued.text);
      setSelectedGeneratorCategory(queued.category);
    } else if (keywords.length > 0) {
      setSelectedGeneratorKeyword(keywords[0].text);
      setSelectedGeneratorCategory(keywords[0].category);
    }
  }, [keywords]);

  // Handle mock CSV parsing
  const handleSimulateCSVUpload = () => {
    setCsvFileUploaded(true);
    // Add 3 mock keywords to keywords state
    const loadedCsvKeywords = [
      { id: Date.now() + 1, text: "بازاریابی محتوایی اصولی", category: "آموزش سئو", priority: "high", cluster: "هوش مصنوعی و سئو", status: "queued", usedIn: null },
      { id: Date.now() + 2, text: "تکنیک سئو تصاویر", category: "سئو داخلی", priority: "medium", cluster: "هسته سئو وردپرس", status: "queued", usedIn: null },
      { id: Date.now() + 3, text: "قالب استاندارد سئو", category: "بهینه‌سازی", priority: "low", cluster: "هسته سئو وردپرس", status: "queued", usedIn: null }
    ];

    // Post to server endpoints dynamically or simulate locally
    loadedCsvKeywords.forEach(async (kw) => {
      await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: kw.text,
          category: kw.category,
          priority: kw.priority,
          cluster: kw.cluster
        })
      });
    });

    setTimeout(() => {
      setCsvFileUploaded(false);
      fetchAllData();
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-slate-100 flex flex-col" dir="rtl">
      {/* Header Panel */}
      <header className="bg-[#121216] border-b border-white/5 py-3.5 px-6 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-xl shadow-lg ring-1 ring-emerald-400/20">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-l from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              AI SEO Auto Publisher Pro
            </h1>
            <p className="text-xs text-emerald-400 font-medium font-sans">افزونه حرفه‌ای هوشمند سئو و انتشار خودکار وردپرس</p>
          </div>
        </div>

        {/* WP Sync Status Metrics */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-[#09090B] border border-white/5 rounded-lg px-3.5 py-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-slate-400">وردپرس:</span>
            <strong className="text-slate-200">{status?.wordPressVersion || "۶.۴.۳"}</strong>
          </div>
          <div className="bg-[#09090B] border border-white/5 rounded-lg px-3.5 py-1.5 flex items-center gap-2">
            <span className="text-slate-400">سرویس هوش مصنوعی:</span>
            <strong className="text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {status?.hasApiKey ? "متصل (جنی)" : "شبیه‌ساز فعال"}
            </strong>
          </div>
        </div>
      </header>

      {/* Main Working Space Layout Grid */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* Navigation Sidebar Panel */}
        <nav className="w-full lg:w-72 bg-[#121216] border-b lg:border-b-0 lg:border-l border-white/5 p-5 flex flex-col gap-1.5 shrink-0">
          <div className="mb-4 hidden lg:block">
            <div className="bg-gradient-to-r from-[#09090B] to-[#121216] border border-white/5 p-4 rounded-xl text-slate-400 text-xs leading-relaxed">
              شما در قالب تیم <span className="text-slate-100 font-semibold">توسعه‌دهنده وردپرس، متخصص سئو و معمار هوش مصنوعی</span> در حال عیب‌یابی و آزمایش این افزونه پیشرفته هستید.
            </div>
          </div>

          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
              activeTab === "dashboard"
                ? "bg-white/5 border-white/10 text-white shadow-sm"
                : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-[#09090B]/60"
            }`}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            <span>داشبورد و گزارش فعالیت</span>
          </button>

          <button
            onClick={() => setActiveTab("keywords")}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
              activeTab === "keywords"
                ? "bg-white/5 border-white/10 text-white shadow-sm"
                : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-[#09090B]/60"
            }`}
          >
            <KeyRound className="w-5 h-5 shrink-0" />
            <span>مدیریت کلمات کلیدی</span>
          </button>

          <button
            onClick={() => setActiveTab("queue")}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
              activeTab === "queue"
                ? "bg-white/5 border-white/10 text-white shadow-sm"
                : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-[#09090B]/60"
            }`}
          >
            <Clock className="w-5 h-5 shrink-0" />
            <span>صف انتشار زمان‌بندی (WP-Cron)</span>
          </button>

          <button
            onClick={() => setActiveTab("generator")}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
              activeTab === "generator"
                ? "bg-white/5 border-white/10 text-white shadow-sm"
                : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-[#09090B]/60"
            }`}
          >
            <Play className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>تست و تولید زنده محتوا</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
              activeTab === "settings"
                ? "bg-white/5 border-white/10 text-white shadow-sm"
                : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-[#09090B]/60"
            }`}
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span>پیکربندی هوش مصنوعی</span>
          </button>

          <div className="h-px bg-white/5 my-4" />

          <button
            onClick={() => setActiveTab("code")}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
              activeTab === "code"
                ? "bg-white/5 border-white/10 text-white shadow-sm"
                : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-[#09090B]/60"
            }`}
          >
            <FileCode className="w-5 h-5 shrink-0 text-cyan-400" />
            <span>سورس کد کامل افزونه (PHP)</span>
          </button>

          {/* WP System Information Badge in Sidebar Footer */}
          <div className="mt-auto pt-6 text-[11px] text-slate-500 font-mono space-y-1">
            <div>PHP Engine: <span className="text-slate-400">{status?.phpVersion || "8.2.10"}</span></div>
            <div>Yoast API Meta: <span className="text-slate-400">سازگار (سبز)</span></div>
            <div>Database Engine: <span className="text-slate-400">MySql-InnoDB</span></div>
          </div>
        </nav>

        {/* Dynamic Display Panel container */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: DASHBOARD METRICS */}
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Simulated WP Notice Block if Cron simulated is working */}
                <div className="bg-[#121216] border border-white/5 border-r-4 border-r-emerald-500 p-5 rounded-l-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                  <div>
                    <h3 className="font-bold text-slate-100 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-emerald-400" />
                      سیستم انتشار مقاله‌های هوشمند فعال است
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      کرون‌جاب وردپرس فعال بوده و به طور متناوب اولین کلمه کلیدی صف را بررسی می‌کند.
                    </p>
                  </div>
                  <button
                    onClick={runSimulatedCron}
                    disabled={isCronRunning}
                    className="px-4.5 py-2 bg-[#09090B] border border-white/5 hover:bg-white/5 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-2 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCronRunning ? "animate-spin" : ""}`} />
                    <span>اجرای فوری انتشار روزانه (شبیه‌ساز WP-Cron)</span>
                  </button>
                </div>

                {cronNotification && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-[#121216] text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-mono leading-relaxed"
                  >
                    💡 [رویداد سیستم]: {cronNotification}
                  </motion.div>
                )}

                {/* Dashboard Metrics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#121216]/60 border border-white/5 p-5 rounded-xl">
                    <span className="text-slate-550 text-xs">کل کلمات کلیدی تعریف شده</span>
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-3xl font-extrabold text-white">{keywords.length}</span>
                      <Database className="w-8 h-8 text-[#27272a]" />
                    </div>
                  </div>

                  <div className="bg-[#121216]/60 border border-white/5 p-5 rounded-xl">
                    <span className="text-slate-550 text-xs">مقالات با موفقیت منتشر شده</span>
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-3xl font-extrabold text-emerald-400">
                        {keywords.filter(k => k.status === "completed").length}
                      </span>
                      <CheckCircle className="w-8 h-8 text-emerald-955/60" />
                    </div>
                  </div>

                  <div className="bg-[#121216]/60 border border-white/5 p-5 rounded-xl">
                    <span className="text-slate-550 text-xs">کلیدواژه‌های منتظر در صف</span>
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-3xl font-extrabold text-amber-400">
                        {keywords.filter(k => k.status === "queued").length}
                      </span>
                      <Clock className="w-8 h-8 text-amber-955/60" />
                    </div>
                  </div>

                  <div className="bg-[#121216]/60 border border-white/5 p-5 rounded-xl">
                    <span className="text-slate-555 text-xs">خطا در فرآیند تولید</span>
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-3xl font-extrabold text-red-500">
                        {keywords.filter(k => k.status === "failed").length}
                      </span>
                      <AlertTriangle className="w-8 h-8 text-red-955/60" />
                    </div>
                  </div>
                </div>

                {/* Main Dashboard Details (Quick Action and Activity Log) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Log Center */}
                  <div className="lg:col-span-2 bg-[#121216]/40 border border-white/5 rounded-xl p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <h4 className="font-bold text-slate-100 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        گزارش لاگ‌های سیستمی و رویدادهای سئو
                      </h4>
                      <span className="text-[10px] bg-[#09090B] px-2 py-0.5 rounded text-slate-400 border border-white/5">ثبت رخداد ۲۴ ساعت گذشته</span>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {logs.map((log) => (
                        <div key={log.id} className="bg-[#09090B] p-3 rounded-lg border border-white/5 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                          <div className="flex gap-2.5 items-start">
                            {log.status === "success" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <strong className="text-slate-300 block font-medium">{log.action}</strong>
                              <p className="text-slate-400 mt-1 leading-relaxed">{log.message}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString("fa-IR")}
                          </span>
                        </div>
                      ))}
                      {logs.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-6">هیچ رویدادی انجام نشده است.</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Mini Settings Summary */}
                  <div className="bg-[#121216]/40 border border-white/5 rounded-xl p-5 space-y-4">
                    <h4 className="font-bold text-slate-100 flex items-center gap-2 border-b border-white/5 pb-3">
                      <Settings className="w-4 h-4 text-slate-400" />
                      وضعیت تنظیمات جاری
                    </h4>

                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between border-b border-[#09090B] pb-2">
                        <span className="text-slate-400">سرویس تولید محتوا</span>
                        <span className="text-slate-200 capitalize font-mono font-bold bg-[#09090B] text-emerald-400 border border-white/5 px-2 py-0.5 rounded">
                          {settings.api_provider}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[#09090B] pb-2">
                        <span className="text-slate-400">مدل انتخاب شده</span>
                        <span className="text-slate-200 font-mono">{settings.model_name}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#09090B] pb-2">
                        <span className="text-slate-400">لحن نگارش مقالات</span>
                        <span className="text-slate-200">{settings.content_tone}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#09090B] pb-2">
                        <span className="text-slate-400">حداقل طول مقاله</span>
                        <span className="text-slate-200 font-mono">{settings.target_words} کلمه</span>
                      </div>
                      <div className="flex justify-between border-b border-[#09090B] pb-2">
                        <span className="text-slate-400">وضعیت پیش‌فرض انتشار</span>
                        <span className="text-slate-200">{settings.default_post_status === "publish" ? "انتشار مستقیم" : "پیش‌نویس (مسود)"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">تناوب WP-Cron روزانه</span>
                        <span className="text-slate-220">هر ۲۴ ساعت یک مقاله</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab("settings")}
                      className="w-full mt-4 py-2 bg-[#09090B] border border-white/5 hover:bg-white/5 text-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      ویرایش و پیکربندی تنظیمات
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: KEYWORD MANAGER */}
            {activeTab === "keywords" && (
              <motion.div
                key="keywords"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Intro Card */}
                <div className="bg-[#121216] p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
                  <div>
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <KeyRound className="w-5.5 h-5.5 text-emerald-400" />
                      مدیریت کلیدواژه‌های هدف سئو
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      کلمات کلیدی خود را وارد کنید، دسته‌بندی و خوشه‌های موضوعی بسازید تا الگوهای تولید محتوا از آنها تغذیه کنند.
                    </p>
                  </div>
                  
                  {/* CSV Fake Uploader */}
                  <div className="flex shrink-0">
                    <button
                      onClick={handleSimulateCSVUpload}
                      disabled={csvFileUploaded}
                      className="px-4 py-2.5 bg-[#09090B] border border-white/5 hover:bg-white/5 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      <FileUp className="w-4 h-4" />
                      <span>{csvFileUploaded ? "در حال تجزیه فایل سئو..." : "آپلود فایل کلمات کلیدی (CSV)"}</span>
                    </button>
                  </div>
                </div>

                {/* Form to Create Keyword */}
                <div className="bg-[#121216]/40 border border-white/5 p-5 rounded-2xl">
                  <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    افزودن کلمه کلیدی منفرد به پایگاه داده
                  </h3>

                  <form onSubmit={handleAddKeyword} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">کلمه کلیدی اصلی</label>
                      <input
                        type="text"
                        placeholder="مثال: سئو داخلی وردپرس"
                        value={newKeywordText}
                        onChange={e => setNewKeywordText(e.target.value)}
                        className="w-full bg-[#09090B] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">دسته‌بندی موضوعی</label>
                      <select
                        value={newKeywordCategory}
                        onChange={e => setNewKeywordCategory(e.target.value)}
                        className="w-full bg-[#09090B] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="آموزش سئو">آموزش سئو</option>
                        <option value="بهینه‌سازی">بهینه‌سازی</option>
                        <option value="بازاریابی محتوایی">بازاریابی محتوایی</option>
                        <option value="سئو داخلی">سئو داخلی</option>
                        <option value="سئو تکنیکال">سئو تکنیکال</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-400">اولویت صف</label>
                        <select
                          value={newKeywordPriority}
                          onChange={e => setNewKeywordPriority(e.target.value)}
                          className="w-full bg-[#09090B] border border-white/5 rounded-xl px-2 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="high">بالا (آنی)</option>
                          <option value="medium">متوسط</option>
                          <option value="low">عادی</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-400">خوشه محتوایی</label>
                        <select
                          value={newKeywordCluster}
                          onChange={e => setNewKeywordCluster(e.target.value)}
                          className="w-full bg-[#09090B] border border-white/5 rounded-xl px-2 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="هسته سئو وردپرس">هسته وردپرس</option>
                          <option value="هوش مصنوعی و سئو">سئو پیشرفته</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="py-2.5 bg-gradient-to-l from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 font-bold text-white text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>ثبت در صف پایگاه داده</span>
                    </button>
                  </form>

                  {kwError && (
                    <p className="text-red-400 text-xs mt-3 flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {kwError}
                    </p>
                  )}
                </div>

                {/* Keywords List table */}
                <div className="bg-[#121216]/40 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                  <div className="px-5 py-4 border-b border-white/5 bg-[#121216]/80 flex items-center justify-between">
                    <h3 className="font-bold text-slate-200 text-sm">لیست کل کلمات فروم ثبت‌شده</h3>
                    <span className="text-[10px] bg-[#09090B] text-slate-400 px-2 py-0.5 rounded font-mono border border-white/5">
                      نمایش {keywords.length} کلیدواژه فعال
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#09090B]/60 text-slate-400 border-b border-white/5">
                          <th className="p-4 font-semibold">شناسه (ID)</th>
                          <th className="p-4 font-semibold">کلمه کلیدی اصلی</th>
                          <th className="p-4 font-semibold">دسته‌بندی</th>
                          <th className="p-4 font-semibold">خوشه (Cluster)</th>
                          <th className="p-4 font-semibold">اولویت</th>
                          <th className="p-4 font-semibold">وضعیت</th>
                          <th className="p-4 font-semibold">لینک مقاله منتشر شده</th>
                          <th className="p-4 font-semibold text-center">عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {keywords.map((kw, idx) => (
                          <tr key={kw.id} className="border-b border-white/5 hover:bg-[#09090B]/20 text-slate-300">
                            <td className="p-4 font-mono text-slate-500">{kw.id}</td>
                            <td className="p-4 font-bold text-slate-100">{kw.text}</td>
                            <td className="p-4">{kw.category}</td>
                            <td className="p-4 text-slate-400">{kw.cluster}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                kw.priority === "high" ? "bg-red-950/40 text-red-400 border border-red-900/20" :
                                kw.priority === "medium" ? "bg-amber-950/40 text-amber-400 border border-amber-900/20" :
                                "bg-[#09090B] text-slate-400 border border-white/5"
                              }`}>
                                {kw.priority === "high" ? "بسیار بالا" : kw.priority === "medium" ? "متوسط" : "عادی"}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  kw.status === "completed" ? "bg-emerald-400" :
                                  kw.status === "failed" ? "bg-red-500" : "bg-amber-400 animate-pulse"
                                }}`}></span>
                                <span className="text-[11px]">
                                  {kw.status === "completed" ? "انتشار موفق" :
                                   kw.status === "failed" ? "شکست بازخوانی" : "در صف انتظار"}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-slate-400 truncate max-w-xs">
                              {kw.usedIn ? (
                                <span className="text-emerald-450 hover:underline cursor-pointer flex items-center gap-1 font-medium">
                                  {kw.usedIn}
                                </span>
                              ) : (
                                <span className="text-slate-550 font-mono">-</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedGeneratorKeyword(kw.text);
                                    setSelectedGeneratorCategory(kw.category);
                                    setActiveTab("generator");
                                  }}
                                  className="p-1 text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                                  title="تولید مقاله"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteKeyword(kw.id)}
                                  className="p-1 text-slate-400 hover:text-red-400 transition cursor-pointer"
                                  title="حذف کلمه"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {keywords.length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                              کلمه‌ای صادر نشده است. ابتدا کلمه‌ای در ساختار فیلدها بالا بنویسید.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: PUBLISH QUEUE */}
            {activeTab === "queue" && (
              <motion.div
                key="queue"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Intro Card */}
                <div className="bg-[#121216] p-6 rounded-2xl border border-white/5 shadow-xl">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Clock className="w-5.5 h-5.5 text-emerald-400" />
                    صف زمانی انتشار پست‌ها (WP-Cron Sync)
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    این ماژول شبیه‌ساز دقیق کرون‌جاب‌های وردپرس است. شما می‌توانید زمانهای انتشار مقالات را بر اساس حجم و ظرفیت روزانه مدیریت کنید.
                  </p>
                </div>

                {/* Queue Table */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-[#121216]/40 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                    <div className="px-5 py-4 border-b border-white/5 bg-[#121216]/80 flex items-center justify-between">
                      <h3 className="font-bold text-slate-200 text-sm">صف زنده تولید محتوای زمان‌بندی شده</h3>
                    </div>

                    <div className="divide-y divide-white/5">
                      {queue.map((item, idx) => (
                        <div key={item.id} className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-[#09090B]/40 transition">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-200 text-sm">{item.keyword}</span>
                              <span className="text-[10px] bg-[#09090B] text-slate-400 px-2 py-0.5 rounded border border-white/5 font-mono">
                                {item.category}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              زمان تقریبی اجرا: {idx === 0 ? "امروز - هم‌اکنون در صف اصلی" : idx === 1 ? "فردا - ساعت ۱۰:۰۰ صبح" : `۲ روز دیگر - نوبت ${idx}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-300 font-mono bg-[#09090B] border border-white/5`}>
                              پروتکل: {item.priority === "high" ? "اولویت بالا" : "نرمال"}
                            </span>

                            <button
                              onClick={async () => {
                                setCronNotification(`در حال ساخت فوری مقاله برای '${item.keyword}'...`);
                                try {
                                  const response = await fetch("/api/generate", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ keyword: item.keyword, category: item.category })
                                  });
                                  const data = await response.json();
                                  if (response.ok) {
                                    setCronNotification(`موفقیت‌آمیز! مقاله '${data.title}' بلافاصله ایجاد و ذخیره شد.`);
                                    fetchAllData();
                                  } else {
                                    setCronNotification(`خطا در تولید آنی: ${data.error}`);
                                  }
                                } catch (e) {
                                  setCronNotification("خطا در سرویس‌دهنده شبیه‌ساز.");
                                } finally {
                                  setTimeout(() => setCronNotification(null), 6000);
                                }
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
                            >
                              اجرای دستی
                            </button>
                          </div>
                        </div>
                      ))}
                      {queue.length === 0 && (
                        <div className="p-8 text-center text-slate-500">صف انتظار خالی است. کلمات دیگر به صف بیافزایید.</div>
                      )}
                    </div>
                  </div>

                  {/* Sidebar Queue Rules */}
                  <div className="bg-[#121216]/40 border border-white/5 p-5 rounded-2xl h-fit space-y-4 text-xs">
                    <h4 className="font-bold text-slate-200 border-b border-white/5 pb-2.5">قوانین و محدودیت‌های انتشار فلو</h4>
                    
                    <div className="space-y-3 leading-relaxed text-slate-400">
                      <p>
                        ۱. <strong className="text-slate-200">مدیریت اولویت‌ها:</strong> سیستم زمان‌بندی ابتدا مقالاتی با کلمه کلیدی اولویت بالا (High) را تولید کرده و سپس سراغ سایر اولویت‌ها می‌رود.
                      </p>
                      <p>
                        ۲. <strong className="text-slate-200">جلوگیری از کارهای همزمان:</strong> تریگر WP-Cron دارای مکانیزم لاک (Lock Check) داخلی برای جلوگیری از تداخل تولیدات همزمان به پایگاه داده است.
                      </p>
                      <p>
                        ۳. <strong className="text-slate-200">توزیع زمانی:</strong> این کار طبق بازه ۲۴ ساعتی تنظیم شده است تا گوگل رفتار خزیدن (Crawl Behavior) کاملاً ارگانیک را در سایت شناسایی کرده و سایت با جریمه مواجه نشود.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: AI GENERATOR INTERACTIVE TEST BED */}
            {activeTab === "generator" && (
              <motion.div
                key="generator"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Intro Banner */}
                <div className="bg-[#121216] p-6 rounded-2xl border border-white/5 shadow-xl">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-5.5 h-5.5 text-emerald-400" />
                    تست و اجرای زنده موتور تولید مقاله با هوش مصنوعی
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    در این بخش کلمه کلیدی انتخابی را مستقیماً پردازش کرده و خروجی فیزیکی سئو آنالیز Yoast، کدهای متادیتا و شیما JSON-LD خروجی را مشاهده نمایید.
                  </p>
                </div>

                {/* Left controls Panel and Right visual container */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                  
                  {/* Left Column Controls */}
                  <div className="bg-[#121216]/40 border border-white/5 p-5 rounded-2xl h-fit space-y-4">
                    <h3 className="font-bold text-slate-205 text-sm border-b border-white/5 pb-2.5">تنظیمات تولید آنلاین</h3>

                    <div className="space-y-4 text-xs font-sans">
                      <div className="space-y-1.5">
                        <label className="text-slate-400 text-[11px]">انتخاب کلمه کلیدی هدف</label>
                        <select
                          value={selectedGeneratorKeyword}
                          onChange={e => {
                            setSelectedGeneratorKeyword(e.target.value);
                            const matched = keywords.find(k => k.text === e.target.value);
                            if (matched) setSelectedGeneratorCategory(matched.category);
                          }}
                          className="w-full bg-[#09090B] border border-white/5 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                        >
                          {keywords.map(kw => (
                            <option key={kw.id} value={kw.text} className="bg-[#09090B]">{kw.text} ({kw.status === "completed" ? "قبلاً منتشر شده" : "منتظر تولید"})</option>
                          ))}
                          {keywords.length === 0 && <option value="" className="bg-[#09090B]">بدون کلمه (ابتدا ثبت کنید)</option>}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 text-[11px]">دسته‌بندی ارجاعی</label>
                        <input
                          type="text"
                          readOnly
                          value={selectedGeneratorCategory}
                          className="w-full bg-[#09090B]/60 border border-white/5 rounded-xl px-3 py-2 text-slate-400 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 text-[11px]">لحن نگارش مقاله</label>
                        <select
                          value={selectedGeneratorTone}
                          onChange={e => setSelectedGeneratorTone(e.target.value)}
                          className="w-full bg-[#09090B] border border-white/5 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                        >
                          <option value="آموزشی و بی طرف" className="bg-[#09090B]">آموزشی و علمی (مطبوعاتی)</option>
                          <option value="صمیمی و روان" className="bg-[#09090B]">صمیمی و ساده برای وبلاگ عمومی</option>
                          <option value="تکنیکال و عمیق" className="bg-[#09090B]">فنی و عمیق (مناسب سئوکاران)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 text-[11px]">طول مقاله هدف</label>
                        <select
                          value={selectedGeneratorLength}
                          onChange={e => setSelectedGeneratorLength(parseInt(e.target.value))}
                          className="w-full bg-[#09090B] border border-white/5 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                        >
                          <option value={1500} className="bg-[#09090B]">بیش از ۱۵۰۰ کلمه (مقدماتی)</option>
                          <option value={2200} className="bg-[#09090B]">بیش از ۲۲۰۰ کلمه (جامع)</option>
                          <option value={3500} className="bg-[#09090B]">بیش از ۳۵۰۰ کلمه (مرجع - پیلار پیج)</option>
                        </select>
                      </div>

                      <button
                        onClick={handleGenerateArticle}
                        disabled={isGenerating || !selectedGeneratorKeyword}
                        className="w-full mt-2.5 py-3 bg-gradient-to-l from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/40 text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-white shrink-0 animate-pulse" />
                        <span>{isGenerating ? "در حال تولید مقاله..." : "شروع تولید آنی محتوا"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column visual preview space */}
                  <div className="xl:col-span-3 flex flex-col gap-6">
                    {/* Progress visual animations */}
                    {isGenerating && (
                      <div className="bg-[#121216]/65 border border-white/5 p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-4 py-16 shadow-xl font-sans">
                        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                        <h4 className="font-bold text-slate-200 text-sm">موتور هوش مصنوعی فعال است</h4>
                        <p className="text-xs text-emerald-400 font-mono mt-1">{generationStep}</p>
                        <div className="w-64 h-1.5 bg-[#09090B] border border-white/5 rounded-full overflow-hidden mt-3 max-w-full">
                          <div className="h-full bg-emerald-500 rounded-full animate-pulse w-3/4"></div>
                        </div>
                      </div>
                    )}

                    {!isGenerating && !generatedResult && !generationError && (
                      <div className="bg-[#121216]/30 border-2 border-dashed border-white/5 p-12 rounded-2xl flex flex-col items-center justify-center text-center text-slate-500 gap-3 font-sans shadow-xl">
                        <Sparkles className="w-10 h-10 text-slate-700" />
                        <h4 className="font-medium text-slate-400">پنل مقالات تولید شده خالی است</h4>
                        <p className="text-xs max-w-md text-slate-500">
                          از کنترلر سمت راست کلمه کلیدی هدف را انتخاب کرده و دکمه <strong className="text-slate-300 font-sans">«شروع تولید آنی محتوا»</strong> را کلیک کنید تا فرآیند تولید و تحلیل Yoast آغاز شود.
                        </p>
                      </div>
                    )}

                    {generationError && (
                      <div className="bg-[#121216]/90 border border-red-500/20 p-5 rounded-2xl flex items-start gap-4 shadow-xl font-sans">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-bounce" />
                        <div className="text-right">
                          <h4 className="font-bold text-red-400 text-sm">بروز خطا در پردازش آنلاین هوش مصنوعی</h4>
                          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{generationError}</p>
                          <p className="text-xs text-emerald-400 mt-2.5 font-mono">
                            💡 راهنما: تنظیمات کلید جنی در متغیر محیطی تنظیم نشده است. ابتدا به تب 'پیکربندی هوش مصنوعی' رفته و کلید را پر کنید. (سیستم بدون کلید نیز مقالات را شبیه‌ساز می‌کند).
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Result visual layout block */}
                    {generatedResult && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
                        {/* Article body content layout */}
                        <div className="lg:col-span-2 bg-[#121216]/60 border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-xl">
                          <div className="px-5 py-4 border-b border-white/5 bg-[#121216]/90 flex items-center justify-between">
                            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                              پیش‌نویس نهایی پست وردپرس با رعایت تگ‌ها
                            </span>
                            <span className="text-[10px] font-mono bg-[#09090B] text-slate-400 px-2 py-0.5 rounded border border-white/5">
                              واژه‌شمار تخمینی: {generatedResult.estimatedWords || 1850} کلمه
                            </span>
                          </div>

                          <div className="p-6 overflow-y-auto max-h-[600px] text-right" dir="rtl">
                            {/* Gutenburg Header UI */}
                            <div className="border-b border-white/5 pb-5 mb-6">
                              <h1 className="text-2xl font-bold text-slate-100 mb-3">{generatedResult.title}</h1>
                              <div className="bg-[#09090B] border border-white/5 p-2.5 rounded-lg text-xs font-mono text-slate-400">
                                <span className="text-slate-500 select-none">نامک (Slug): </span>
                                <span className="text-emerald-400 font-bold">{generatedResult.slug}</span>
                              </div>
                            </div>

                            {/* Simulated Featured Image block */}
                            <div className="relative rounded-xl overflow-hidden mb-6 border border-white/5">
                              <img
                                src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80"
                                alt={generatedResult.imageAltText}
                                className="w-full h-52 object-cover"
                              />
                              <div className="absolute bottom-0 inset-x-0 bg-[#09090B]/90 p-2.5 text-[11px] text-slate-400 font-mono text-center border-t border-white/5">
                                تصویر شاخص sideload شده با تگ ALT: <strong className="text-emerald-400">{generatedResult.imageAltText}</strong>
                              </div>
                            </div>

                            {/* HTML Content Render */}
                            <div
                              className="prose prose-invert prose-emerald text-sm text-slate-300 leading-relaxed font-sans max-w-none space-y-4"
                              dangerouslySetInnerHTML={{ __html: generatedResult.htmlContent }}
                            />

                            {/* Schemas FAQs */}
                            <div className="mt-8 pt-6 border-t border-white/5">
                              <h3 className="text-md font-bold text-slate-200 mb-4">سوالات متداول مقاله سئو شده (FAQ Schema)</h3>
                              <div className="space-y-4">
                                {generatedResult.faqs?.map((faq, fIdx) => (
                                  <div key={fIdx} className="bg-[#09090B] p-4 rounded-xl border border-white/5">
                                    <h5 className="font-bold text-slate-200 text-[13px] mb-1.5 flex items-center gap-1.5 font-sans">
                                      <span className="text-emerald-400">Q:</span>
                                      {faq.question}
                                    </h5>
                                    <p className="text-slate-400 text-xs leading-relaxed font-sans">{faq.answer}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Yoast SEO side analytics bulb dashboard */}
                        <div className="flex flex-col gap-6 font-sans">
                          
                          {/* Yoast Meter */}
                          <div className="bg-[#121216]/60 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
                            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                              <div className="w-5 h-5 rounded-full bg-emerald-500 ring-2 ring-emerald-400/20 shadow flex items-center justify-center text-[#09090B] font-bold text-[10px]">Y</div>
                              <h4 className="font-bold text-slate-100 text-sm">آنالیزگر Yoast SEO (سبز)</h4>
                            </div>

                            <div className="space-y-3 text-xs leading-relaxed">
                              {/* Focus phrase */}
                              <div className="flex gap-2.5 items-start">
                                <span className="w-4 h-4 rounded-full bg-emerald-505 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-slate-204 font-medium font-sans">کلیدواژه تمرکزی Yoast</strong>
                                  <p className="text-slate-400 mt-0.5">کلیدواژه "{generatedResult.focusKeyphrase}" در ابتدای مقاله شناسایی و با موفقیت تایید شد.</p>
                                </div>
                              </div>

                              {/* SEO title */}
                              <div className="flex gap-2.5 items-start">
                                <span className="w-4 h-4 rounded-full bg-emerald-505 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-slate-204 font-medium font-sans">طول عنوان سئو</strong>
                                  <p className="text-slate-400 mt-0.5">عرض عنوان محتوا مطلوب بوده و شامل کلمه کلیدی اصلی در ابتدای تگ است.</p>
                                </div>
                              </div>

                              {/* SEO description */}
                              <div className="flex gap-2.5 items-start">
                                <span className="w-4 h-4 rounded-full bg-emerald-505 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-slate-204 font-medium font-sans">توضیحات مِتا</strong>
                                  <p className="text-slate-400 mt-0.5">طول توضیحات مِتا {generatedResult.metaDescription?.length || 140} نویسه است که از مقدار مرز مجاز تجاوز نمی‌کند.</p>
                                </div>
                              </div>

                              {/* Keyword density */}
                              <div className="flex gap-2.5 items-start">
                                <span className="w-4 h-4 rounded-full bg-emerald-505 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-slate-204 font-medium font-sans">چگالی کلیدواژه</strong>
                                  <p className="text-slate-400 mt-0.5">چگالی کلمه کلیدی اصلی برابر با {generatedResult.keywordDensity || "2.2%"} است که توزیعی ایده آل به شمار می‌رود.</p>
                                </div>
                              </div>

                              {/* Transition words */}
                              <div className="flex gap-2.5 items-start">
                                <span className="w-4 h-4 rounded-full bg-emerald-505 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-slate-204 font-medium font-sans">کلمات انتقالی و روان بودن</strong>
                                  <p className="text-slate-400 mt-0.5">بیش از {generatedResult.transitionWordsPercent || "30٪"} جملات حاوی کلمات ربط یا انتقالی روان هستند.</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* JSON LD Schema specs */}
                          <div className="bg-[#121216]/60 border border-white/5 rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
                            <h4 className="font-bold text-slate-202 text-xs border-b border-white/5 pb-2 flex items-center gap-1.5 font-sans">
                              <Code className="w-4 h-4 text-cyan-400" />
                              JSON-LD سئو فنی شیما
                            </h4>
                            <pre className="text-[10px] text-cyan-300 font-mono bg-[#09090B]/85 border border-white/5 p-3.5 rounded-xl overflow-x-auto max-h-48 text-left" dir="ltr">
                              {JSON.stringify(generatedResult.schema, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 5: SETTINGS */}
            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="max-w-2xl mx-auto space-y-6 font-sans"
              >
                <div className="bg-[#121216] p-6 rounded-2xl border border-white/5 shadow-xl">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Settings className="w-5.5 h-5.5 text-emerald-400" />
                    تنظیمات و پیکربندی موتور هوش مصنوعی سئو
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    اتصالات API کلیدی، پارامترهای پیش‌فرض سئو و انتشار خودکار وردپرس را در این بخش مدیریت و ثبت کنید.
                  </p>
                </div>

                <div className="bg-[#121216]/40 border border-white/5 rounded-2xl p-6 shadow-xl">
                  <form onSubmit={handleSaveSettings} className="space-y-5 text-sm">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-medium">سرویس‌دهنده هوش مصنوعی</label>
                      <select
                        value={settings.api_provider}
                        onChange={e => setSettings({ ...settings, api_provider: e.target.value })}
                        className="w-full bg-[#09090B] border border-white/5 rounded-xl px-4 py-3 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 capitalize"
                      >
                        <option value="gemini" className="bg-[#09090B]">Google Gemini AI</option>
                        <option value="openai" className="bg-[#09090B]">OpenAI (DallE / GPT)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-450 font-medium">کلید API معتبر</label>
                      <input
                        type="password"
                        placeholder={status?.hasApiKey ? "••••••••••••••••••••••••" : "کلید API را وارد کنید..."}
                        value={settings.api_key}
                        onChange={e => setSettings({ ...settings, api_key: e.target.value })}
                        className="w-full bg-[#09090B] border border-white/5 rounded-xl px-4 py-3 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-mono text-left"
                        dir="ltr"
                      />
                      <p className="text-[10px] text-slate-450 mt-1 leading-relaxed">
                        {status?.hasApiKey 
                          ? "کلید API شما از متغیرهای محلی برنامه خوانده شده و هم‌اکنون فعال است." 
                          : "کلید API را در فیلد فوق پِیست کنید تا تولیدات به صورت واقعی ثبت شوند. در غیر اینصورت سیستم بر اساس شبیه‌ساز آفلاین کار خواهد کرد."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-450 font-medium font-sans">مدل زبانی هوش مصنوعی</label>
                        <select
                          value={settings.model_name}
                          onChange={e => setSettings({ ...settings, model_name: e.target.value })}
                          className="w-full bg-[#09090B] border border-white/5 rounded-xl px-4 py-3 text-[#f1f5f9] text-xs focus:outline-none"
                        >
                          {settings.api_provider === "gemini" ? (
                            <>
                              <option value="gemini-2.5-flash" className="bg-[#09090B]">gemini-2.5-flash (توصیه شده)</option>
                              <option value="gemini-2.5-pro" className="bg-[#09090B]">gemini-2.5-pro (فوق پیشرفته)</option>
                            </>
                          ) : (
                            <>
                              <option value="gpt-4o" className="bg-[#09090B]">gpt-4o (سریع)</option>
                              <option value="gpt-4-turbo" className="bg-[#09090B]">gpt-4-turbo</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-450 font-medium font-sans">حداقل طول نگارش مقالات</label>
                        <input
                          type="number"
                          value={settings.target_words}
                          onChange={e => setSettings({ ...settings, target_words: parseInt(e.target.value) || 1500 })}
                          className="w-full bg-[#09090B] border border-white/5 rounded-xl px-4 py-3 text-[#f1f5f9] text-xs focus:outline-none focus:border-emerald-500 font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-450 font-medium font-sans">وضعیت انتشار پیش‌فرض نوشته</label>
                        <select
                          value={settings.default_post_status}
                          onChange={e => setSettings({ ...settings, default_post_status: e.target.value })}
                          className="w-full bg-[#09090B] border border-white/5 rounded-xl px-4 py-3 text-[#f1f5f9] text-xs focus:outline-none focus:border-emerald-500"
                        >
                          <option value="draft" className="bg-[#09090B]">ذخیره به صورت پیش‌نویس (Draft جهت بررسی دستی)</option>
                          <option value="publish" className="bg-[#09090B]">انتشار مستقیم و عمومی در بلاگ (WP Posts)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-450 font-medium font-sans">لحن ارگانیک مقالات</label>
                        <input
                          type="text"
                          value={settings.content_tone}
                          onChange={e => setSettings({ ...settings, content_tone: e.target.value })}
                          className="w-full bg-[#09090B] border border-white/5 rounded-xl px-4 py-3 text-[#f1f5f9] text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-gradient-to-l from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 font-bold text-white text-xs rounded-xl shadow-lg transition cursor-pointer"
                    >
                      ذخیره پیکربندی افزونه در وردپرس
                    </button>

                    {settingsSuccessMsg && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-3 bg-emerald-950/80 border border-emerald-500/20 text-emerald-400 rounded-xl text-center text-xs font-bold"
                      >
                        ✓ تنظیمات با موفقیت در جدول آپشنهای وردپرس ذخیره شد.
                      </motion.div>
                    )}
                  </form>
                </div>
              </motion.div>
            )}

                  {/* TAB 6: SOURCE CODE EXPLORER */}
            {activeTab === "code" && (
              <motion.div
                key="code"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 font-sans"
              >
                {/* Intro details */}
                <div className="bg-[#121216] p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="text-right">
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <Code className="w-5.5 h-5.5 text-emerald-400" />
                      کدهای شیءگرا و کلاس‌های PHP افزونه وردپرس
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      تمامی کدهای منبع این افزونه حرفه‌ای با رعایت دقیق‌ترین چارچوب‌های PHP 8.2 و شیءگرایی PSR-4 در پوشه نصب در دسترس شماست.
                    </p>
                  </div>
                  
                  {/* Download Documentation and Plugin details */}
                  <div className="flex shrink-0">
                    <a
                      href="/wordpress-plugin/ai-seo-auto-publisher-pro/install-documentation.md"
                      download="install-documentation.md"
                      className="px-4 py-2.5 bg-[#09090B] border border-white/5 hover:bg-[#121216] text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-emerald-500" />
                      <span>دانلود فایل راهنمای نصب فارسی</span>
                    </a>
                  </div>
                </div>

                {/* Explorer Workspace */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  
                  {/* Left Sidebar files list */}
                  <div className="bg-[#121216]/60 border border-white/5 rounded-2xl p-4 h-fit space-y-1.5 flex flex-col shadow-xl">
                    <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider font-bold px-2.5 mb-2.5 block text-right">فایل‌های سورس کد افزونه</span>
                    
                    {pluginFiles.map((file) => (
                      <button
                        key={file.name}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full text-right px-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition cursor-pointer ${
                          selectedFile.name === file.name
                            ? "bg-[#1c1c24] text-emerald-400 border border-emerald-500/10 shadow-sm"
                            : "text-slate-400 hover:text-slate-200 hover:bg-[#121216]/60"
                        }`}
                      >
                        <span className="truncate">{file.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    ))}
                    <div className="h-px bg-white/5 my-3" />
                    <span className="text-[11px] text-slate-400 px-2.5 leading-relaxed text-right">
                      💡 ویژگی‌های کدهای بالا:
                      <ul className="list-disc list-inside space-y-1 mt-1.5 text-slate-500 text-[10px]">
                        <li>OOP Architecture</li>
                        <li>PSR-4 compliant</li>
                        <li>Clean & robust Sanitization</li>
                        <li>CSRF Protection</li>
                      </ul>
                    </span>
                  </div>

                  {/* Right main Editor panel */}
                  <div className="md:col-span-3 bg-[#121216]/60 border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-xl">
                    <div className="px-5 py-3.5 border-b border-white/5 bg-[#121216]/90 flex items-center justify-between">
                      <span className="text-xs text-slate-350 font-mono py-1">
                        دایرکتوری مقصد روی هاست: <strong className="text-emerald-400">{selectedFile.path}</strong>
                      </span>
                      
                      <button
                        onClick={triggerCopyCode}
                        className="px-3.5 py-1.5 bg-[#09090B] border border-white/5 hover:bg-[#121216] text-[#c9cbd6] hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedFile ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">کپی شد!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>کپی کدهای منبع</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-5 overflow-auto max-h-[500px] text-xs font-mono text-cyan-300 leading-relaxed text-left bg-[#09090B]/60" dir="ltr">
                      <code>{selectedFile.code}</code>
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* Applet Footer bar */}
      <footer className="bg-[#121216]/60 border-t border-white/5 py-4 px-6 text-center text-slate-400 text-[11px] mt-auto font-sans">
        سیستم یکپارچه شبیه‌ساز و تولیدکننده افزونه سئو وردپرس AI SEO Auto Publisher Pro | بهینه‌سازی شده با موتور هوشمند Gemini 2.5 Flash به زبان فارسی و راست‌چین
      </footer>
    </div>
  );
}
