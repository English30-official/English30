import express, { NextFunction, Request, RequestHandler, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createClient, User } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type AuthenticatedRequest = Request & { authUser?: User };

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(limit: number, windowMs: number): RequestHandler {
  return (req, res, next) => {
    const userId = (req as AuthenticatedRequest).authUser?.id;
    const key = `${req.path}:${userId ?? req.ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= limit) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'تم تجاوز حد الطلبات. حاول لاحقًا.' });
    }
    bucket.count += 1;
    return next();
  };
}

async function startServer() {
  const app = express();
  const parsedPort = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }
  const PORT = parsedPort;
  const isProduction = process.env.NODE_ENV === 'production';
  const supabaseUrl = process.env.SUPABASE_URL || (!isProduction ? process.env.VITE_SUPABASE_URL : undefined);
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || (!isProduction ? (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY) : undefined);

  const validSupabaseUrl = Boolean(supabaseUrl && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl));
  const validSupabaseKey = Boolean(supabaseKey && !supabaseKey.includes('your-supabase') && supabaseKey.length >= 30);
  if (!validSupabaseUrl || !validSupabaseKey || !supabaseUrl || !supabaseKey) {
    throw new Error('Missing required server Supabase configuration: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
  }

  const authClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const requireActiveUser = async (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.header('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    if (!token) return res.status(401).json({ error: 'Authentication required.' });

    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired access token.' });

    const userClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('is_active,is_suspended')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profileError) return res.status(503).json({ error: 'Unable to verify account status.' });
    if (!profile || profile.is_active === false || profile.is_suspended === true) {
      return res.status(403).json({ error: 'Account is suspended.' });
    }

    (req as AuthenticatedRequest).authUser = data.user;
    res.locals.userClient = userClient;
    return next();
  };

  const requireStaff = async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthenticatedRequest).authUser?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    const { data, error } = await res.locals.userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .limit(1)
      .maybeSingle();
    if (error) return res.status(503).json({ error: 'Unable to verify authorization.' });
    if (!data) return res.status(403).json({ error: 'Owner or admin access required.' });
    return next();
  };

  const requireGemini: RequestHandler = (_req, res, next) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({ error: 'AI service is not configured.' });
    }
    return next();
  };

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=()');
    if (isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use(express.json({ limit: '100kb' }));

  // API Route for AI English Tutor (Arabic friendly)
  app.post('/api/ai-tutor', requireActiveUser, rateLimit(30, 60_000), requireGemini, async (req, res) => {
    try {
      const { message, history } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        const ai = new GoogleGenAI({ apiKey });
        
        const systemPrompt = `أنت "Mr. Alex" - المعلم الذكي والرفيق التعليمي للغة الإنجليزية في منصة English30.
مهمتك مساعدة الطلاب الناطقين باللغة العربية على تعلم وتطوير لغتهم الإنجليزية بأسلوب مشجع، بسيط، ودقيق.

قواعدك الأساسية:
1. اشرح المفاهيم والقواعد والكلمات باللغة العربية المبسطة مع إعطاء أمثلة واضحة بالإنجليزية وترجمتها.
2. إذا طلب الطالب صحح لي جملته، صححها له مع تبيان السبب والملاحظة النحوية بالعربية.
3. إذا طلب التدرب على محادثة، تحدث معه بالإنجليزية مع إتاحة توضيحات وترجمة باللغة العربية عند الحاجة.
4. حافظ على نبرة إيجابية، مشجعة، وواضحة جداً للمبتدئين والمتوسطين.
5. نسّق إجابتك باستخدام نقاط، أمثلة بارزة، وتنسيق مريح للعين.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nرسالة الطالب: ${message}` }] }
          ]
        });

        const reply = response.text || 'عذراً، لم أستطع معالجة الإجابة حالياً. يرجى المحاولة مرة أخرى.';
        return res.json({ reply });
      } else {
        // Smart fallback response for simulation when key isn't present
        let reply = '';
        const msgLower = message.toLowerCase();

        if (msgLower.includes('فرق') || msgLower.includes('in') || msgLower.includes('on') || msgLower.includes('at')) {
          reply = `👋 مرحباً بك! إليك توضيح مبسط للفرق بين حروف الجر الزمانية والمكانية (In / On / At):

1️⃣ **At (للمحدد جداً):**
- **الوقت المحدد:** At 5:00 PM (في الخامسة مساءً).
- **الأماكن المحددة:** At home, At the door (في المنزل، عند الباب).

2️⃣ **On (للأيام والسطوح):**
- **الأيام والتواريخ:** On Monday, On June 15th.
- **الأسطح:** On the table (على الطاولة).

3️⃣ **In (للأوقات العامة والأماكن المغلقة/الكبيرة):**
- **الشهور والسنوات:** In May, In 2026.
- **المدن والدول:** In Riyadh, In Saudi Arabia.

💡 **نصيحة ذهبية:** تخيل هرم معكوس: In في الأعلى (الأكبر)، On في الوسط، At في الأسفل (الأكثر تحديداً)!`;
        } else if (msgLower.includes('صحح') || msgLower.includes('correct') || msgLower.includes('yesterday')) {
          reply = `✨ **تصحيح الجملة:**

❌ **الخطأ:** *I am go to school yesterday.*
✅ **الصواب:** *I went to school yesterday.*

🔍 **التوضيح النحوي:**
كلمة **yesterday** (أمس) تشير إلى الماضي البسيط (Past Simple).
لذا يجب استخدام التصريف الثاني للفاعل *go* وهو **went** بدلاً من *am go*.

🌟 **مثال إضافي:**
- *I went to the supermarket yesterday.* (ذهبت إلى السوبرماركت أمس).`;
        } else if (msgLower.includes('سفر') || msgLower.includes('travel') || msgLower.includes('مفردات')) {
          reply = `✈️ **5 مفردات هامة جداً للسفر والمطار:**

1️⃣ **Boarding Pass** /بوردينغ باس/
- 🇸🇦 **المعنى:** بطاقة صعود الطائرة.
- 💬 **مثال:** Please present your boarding pass at gate 4.

2️⃣ **Baggage Claim** /باغيج كليم/
- 🇸🇦 **المعنى:** منطقة استلام الأمتعة.
- 💬 **مثال:** Where is the baggage claim area?

3️⃣ **Departure** /ديبارتشر/
- 🇸🇦 **المعنى:** المغادرة.
- 💬 **مثال:** Our flight departure is at 10:00 AM.

4️⃣ **Customs** /كاستمز/
- 🇸🇦 **المعنى:** الجمارك.
- 💬 **مثال:** We cleared customs quickly.

5️⃣ **Delay** /ديلاي/
- 🇸🇦 **المعنى:** تأخير.
- 💬 **مثال:** The flight has a 20-minute delay.`;
        } else {
          reply = `مرحباً بك! أنا **Mr. Alex** معلمك الذكي في منصة English30 🌟.

يمكنك أن تطلب مني:
• 📖 شرح أي قاعدة نحوية (Grammar) بلغة عربية مبسطة.
• 🔤 توضيح معاني الكلمات مع النطق والأمثلة.
• ✍️ تصحيح أي جملة تكتبها بالإنجليزية مع بيان السبب.
• 💬 ممارسة محادثة حية لمواقف مثل (المطار، المطعم، مقابلة العمل).

كيف يمكنني مساعدتك في رحلتك اليوم لتعلم الإنجليزية؟`;
        }

        return res.json({ reply });
      }
    } catch (err: any) {
      console.error('AI Tutor error:', err);
      return res.status(500).json({ error: 'حدث خطأ في الاتصال بالمساعد الذكي' });
    }
  });

  // API Route for Dynamic AI Learning Pack Generator
  app.post('/api/generate-lesson-pack', requireActiveUser, requireStaff, rateLimit(10, 5 * 60_000), requireGemini, async (req, res) => {
    try {
      const { topic, level, wordCount = 10, sentenceCount = 5 } = req.body;

      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ error: 'Topic is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `أنشئ لي بأسلوب مجدول ودقيق محتوى تعليمي كامل ومكتمل JSON لمنصة English30 بالمواصفات التالية:
الموضوع: "${topic}"
المستوى CEFR: "${level || 'A2'}"
عدد الكلمات المطلوبة: ${wordCount}
عدد الجمل المطلوبة: ${sentenceCount}

يجب أن تعيد كائن JSON صالح فقط بنفس الصياغة التالية بدون أي نص إضافي:
{
  "id": "pack-ai-${Date.now()}",
  "topicKey": "ai-pack-${Date.now()}",
  "titleAr": "درس ${topic} (${level || 'A2'})",
  "titleEn": "${level || 'A2'} ${topic} Lesson Pack",
  "level": "${level || 'A2'}",
  "categoryAr": "موضوعات عامة",
  "descriptionAr": "درس تعليمي مخصص تم إنشاؤه بواسطة الذكاء الاصطناعي حول ${topic}.",
  "summaryAr": "تعلم مفردات وجمل ${topic} بالمستوى ${level || 'A2'}.",
  "arabicExplanation": "# درس ${topic}\\n\\nشرح شامل للمفردات والجمل الخاصة بـ ${topic}.",
  "wordsCount": ${wordCount},
  "sentencesCount": ${sentenceCount},
  "words": [
    {
      "id": "w1",
      "word": "Sample",
      "phonetic": "/ˈsɑːm.pəl/",
      "arabic": "عينة",
      "category": "${topic}",
      "level": "${level || 'A2'}",
      "partOfSpeech": "Noun",
      "exampleEn": "This is a sample sentence.",
      "exampleAr": "هذه جملة عينة."
    }
  ],
  "sentences": [
    {
      "id": "s1",
      "en": "Where is the location?",
      "ar": "أين الموقع؟",
      "category": "${topic}",
      "level": "${level || 'A2'}"
    }
  ],
  "fillInBlankQuestions": [
    {
      "id": "fib1",
      "sentenceWithBlank": "This is a __________ test.",
      "correctAnswer": "sample",
      "options": ["sample", "car", "book", "sun"],
      "translationAr": "هذا اختبار عينة.",
      "explanationAr": "الكلمة المناسبة للتعبير عن عينة هي sample."
    }
  ],
  "quizQuestions": [
    {
      "id": "q1",
      "questionAr": "ما معنى الكلمة؟",
      "questionEn": "What is the meaning?",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctAnswerIndex": 0,
      "explanationAr": "التوضيح النحوي."
    }
  ],
  "finalMiniTest": {
    "titleAr": "الاختبار النهائي القصير",
    "descriptionAr": "اختبار تقييمي للدرس",
    "questions": []
  }
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const rawText = response.text || '';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        return res.json({ pack: parsed });
      } else {
        // High quality fallback dynamic pack generation for demo
        const timestamp = Date.now();
        const fallbackPack = {
          id: `pack-gen-${timestamp}`,
          topicKey: `topic-${timestamp}`,
          titleAr: `مجموعة ${topic} (مستوى ${level || 'A2'})`,
          titleEn: `${level || 'A2'} ${topic} Specialized Pack`,
          level: level || 'A2',
          categoryAr: 'موضوعات مخصصة',
          descriptionAr: `درس شامل تم تعبئته ديناميكياً حول موضوع ${topic} لمستوى ${level || 'A2'} يحتوي على كلمات وجمل مع النطق والتمارين.`,
          summaryAr: `استكشف المفردات والجمل التفاعلية الخاصة بـ ${topic} بالصوت والتمارين.`,
          arabicExplanation: `# 🌟 درس ${topic} (مستوى ${level || 'A2'})\n\nفي هذا الدرس ستتعلم مفردات وجمل هامة متعلقة بـ **${topic}** بأسلوب مبسط ومزود بنطق صوتي وتمارين تفاعلية.`,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          videoDuration: '06:30',
          videoTitleAr: `الشرح المرئي لدرس ${topic}`,
          wordsCount: wordCount,
          sentencesCount: sentenceCount,
          words: Array.from({ length: Math.min(wordCount, 15) }).map((_, idx) => ({
            id: `w-${idx + 1}`,
            word: idx === 0 ? 'Destination' : idx === 1 ? 'Schedule' : idx === 2 ? 'Requirement' : `Vocabulary_${idx + 1}`,
            phonetic: idx === 0 ? '/ˌdes.tɪˈneɪ.ʃən/' : idx === 1 ? '/ˈʃed.juːl/' : '/rɪˈkwaɪə.mənt/',
            arabic: idx === 0 ? 'وجهة / مقصِد' : idx === 1 ? 'جدول المواعيد' : idx === 2 ? 'متطلَب / شرط' : `مفردة ${idx + 1}`,
            category: topic,
            level: level || 'A2',
            partOfSpeech: idx % 2 === 0 ? 'Noun' : 'Verb',
            exampleEn: idx === 0 ? 'What is your final destination?' : 'Please check the daily schedule.',
            exampleAr: idx === 0 ? 'ما هي وجهتك النهائية؟' : 'من فضلك تحقق من الجدول اليومي.',
          })),
          sentences: Array.from({ length: Math.min(sentenceCount, 10) }).map((_, idx) => ({
            id: `s-${idx + 1}`,
            en: idx === 0 ? 'Can you please guide me to the main area?' : idx === 1 ? 'Everything is prepared according to plan.' : `This is key sentence number ${idx + 1} for ${topic}.`,
            ar: idx === 0 ? 'هل يمكنك توجيهي إلى المنطقة الرئيسية من فضلك؟' : idx === 1 ? 'كل شيء معد وفقاً للخطة.' : `هذه هي الجملة الهامة رقم ${idx + 1} المتعلقة بـ ${topic}.`,
            category: topic,
            level: level || 'A2',
          })),
          fillInBlankQuestions: [
            {
              id: 'fib-gen-1',
              sentenceWithBlank: 'Please make sure to check your daily __________.',
              correctAnswer: 'schedule',
              options: ['schedule', 'car', 'sun', 'window'],
              translationAr: 'من فضلك تأكد من مراجعة جدولك اليومي.',
              explanationAr: 'كلمة Schedule تعني الجدول الزمني والمواعيد.',
            },
          ],
          quizQuestions: [
            {
              id: 'qz-gen-1',
              questionAr: `ما المعنى الصحيح لمصطلح Destination في موضوع ${topic}؟`,
              options: ['الجهة / المقصد', 'التأخير', 'السعر', 'الوسيلة'],
              correctAnswerIndex: 0,
              explanationAr: 'Destination تعني الوجهة التي يقصدها الشخص.',
            },
          ],
          finalMiniTest: {
            titleAr: `الاختبار النهائي لدرس ${topic}`,
            descriptionAr: 'تقييم شامل لمدى استيعاب الدرس',
            questions: [
              {
                id: 'fmt-gen-1',
                questionAr: 'اختر الجملة المناسبة لمراجعة المواعيد:',
                options: [
                  'Please check the daily schedule.',
                  'I need to cancel the flight.',
                  'Where is the passport control?',
                  'Thank you for your help.',
                ],
                correctAnswerIndex: 0,
                explanationAr: 'عبارة check the daily schedule تعني مراجعة الجدول اليومي.',
              },
            ],
          },
        };

        return res.json({ pack: fallbackPack });
      }
    } catch (err: any) {
      console.error('Lesson generator error:', err);
      return res.status(500).json({ error: 'حدث خطأ في إنشاء الدرس تلقائياً' });
    }
  });


  // API Route for Owner AI Assistant (Lesson CMS generation, Question Bank generation, Analytics)
  app.post('/api/owner-ai', requireActiveUser, requireStaff, rateLimit(20, 5 * 60_000), requireGemini, async (req, res) => {
    try {
      const { taskType, prompt, level = 'B1' } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        const ai = new GoogleGenAI({ apiKey });
        
        let systemInstruction = `أنت المساعد الذكي المخصص لمالك منصة English30 (Owner AI Assistant).
مهمتك مساعدة المالك في:
1. توليد دروس ومناهج تعليمية هيكلية كاملة (مفردات، قواعد، نصوص قراءة، استماع، تمارين، اختبارات قصيرة).
2. بناء بنوك أسئلة متعددة المستويات ومصنفة بدقة حسب معيار CEFR.
3. تحليل أداء المنصة وتلخيص بيانات الطلاب ومؤشرات الإيرادات.
4. إعداد حملات وكوبونات وإعلانات ترويجية.

أجب باللغة العربية الواضحة والمنسقة مع تقديم المخرجات الإنجليزية بدقة تعليمية رفيعة.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nنوع المهمة: ${taskType || 'general'}\nالمستوى: ${level}\nطلب المالك:\n${prompt}` }],
            },
          ],
        });

        const reply = response.text || 'تمت معالجة الطلب بنجاح.';
        return res.json({ reply });
      } else {
        // Fallback simulation for Owner AI Assistant
        let reply = '';
        const promptLower = prompt.toLowerCase();

        if (promptLower.includes('درس') || promptLower.includes('lesson') || promptLower.includes('سفر') || promptLower.includes('b1')) {
          reply = `✨ **اقتراح درس متكامل جاهز للاستيراد كمسودة (Draft Lesson):**

📌 **العنوان المقترح:** *English for Job Interviews (الإنجليزية لمقابلات العمل)*
🎯 **المستوى:** B1 | **المدة المقدرة:** 20 دقيقة | **نقاط الـ XP:** 60 نقطة

---

### 1️⃣ بنك المفردات الأساسية (Vocabulary Set):
1. **Strengths & Weaknesses** /ˈstreŋkθs/ - نقاط القوة والضعف
2. **Qualifications** /ˌkwɒl.ɪ.fɪˈkeɪ.ʃənz/ - المؤهلات العلمية والمهنية
3. **Problem-solving** - مهارة حل المشكلات
4. **Team Player** - العمل بروح الفريق الواحد
5. **Career Goal** - الهدف المهني

---

### 2️⃣ القاعدة النحوية الشارحة (Grammar Focus):
* **القاعدة:** استخدام *Present Perfect* للتحدث عن الإنجازات السابقة:
* **الصيغة:** \`Subject + have/has + Past Participle (V3)\`
* **مثال:** *"I have managed a team of 5 designers for two years."* (لقد أدرت فريقاً من 5 مصممين لمدة عامين).

---

### 3️⃣ سؤال تقييمي جاهز (Interactive Question):
* **السؤال:** *"How would you describe your ability to handle deadlines?"*
* **الخيارات:**
  - A) I always panic.
  - B) I organize tasks and prioritize urgency. ✅
  - C) I ignore them.
* **التفسير:** الإجابة B تعكس الاحترافية في إدارة الوقت.

💡 **هل ترغب في تصدير هذا المحتوى مباشرة إلى جدول المسودات (Drafts) بضغطة زر؟**`;
        } else if (promptLower.includes('أسئلة') || promptLower.includes('question') || promptLower.includes('بنك')) {
          reply = `🎯 **مجموعة أسئلة مقترحة لبنك الأسئلة المركزي (${level}):**

1. **Question:** *If I ____ the job, I will move to Riyadh.*
   - **Options:** [get ✅, got, have gotten, getting]
   - **Type:** Grammar (First Conditional)
   - **Explanation:** في الجملة الشرطية الأولى، يأتي فعل الشرط في المضارع البسيط.

2. **Question:** *Which word is closest in meaning to "Crucial"?*
   - **Options:** [Unimportant, Essential ✅, Optional, Minor]
   - **Type:** Vocabulary
   - **Explanation:** كلمة Crucial تعني حاسم أو جوهري، ومرادفها Essential.

3. **Question:** *By this time next year, they ____ the project.*
   - **Options:** [will finish, will have finished ✅, finished, are finishing]
   - **Type:** Grammar (Future Perfect)
   - **Explanation:** نستخدم Future Perfect مع تعبير By this time next year.`;
        } else if (promptLower.includes('تحليل') || promptLower.includes('إحصائيات') || promptLower.includes('طلاب') || promptLower.includes('analytics')) {
          reply = `📊 **تقرير تحليلي لأداء منصة English30 للأسبوع الحالي:**

* 👥 **إجمالي الطلاب المسجلين:** 14,200 طالب نشط.
* 💳 **المشتركون في الباقات المدفوعة:** 154 مشتركاً بنسبة تحويل (Conversion Rate) تبلغ 11.2%.
* 💰 **الإيراد الشهري المتكرر (MRR):** 28,450 ريال سعودي.
* 📈 **أعلى الدورات إكمالاً:** *دورة أساسيات الإنجليزية A1* (معدل إكمال 84%).
* ⚠️ **الدرس الأكثر صعوبة للطلاب:** *درس Present Perfect Continuous* (معدل نجاح الكويز 62% - يُنصح بإضافة فيديو توضيحي إضافي).

💡 **توصية المساعد الذكي:** إطلاق حملة ترويجية للمشتركين التجريبيين عبر واتساب/تيليجرام لزيادة نسبة التحويل بنسبة 25%.`;
        } else {
          reply = `أهلاً بك يا مالك المنصة! أنا **مساعد المالك الذكي (Owner AI)** 🤖.

أنا هنا لتسهيل عملك التشغيلي بالكامل:
• 📝 **صياغة المناهج والدروس:** اطلب مني بناء أي درس لمستوى محدد وتوليد المفردات والتمارين.
• ❓ **تغذية بنك الأسئلة:** توليد دفعات أسئلة مصنفة حسب معايير CEFR.
• 📊 **الاستفسار والتحليلات:** اسألني عن أداء الطلاب، معدلات الإكمال، أو نسب الإيرادات.
• 🏷️ **التسويق والكوبونات:** صياغة إعلانات ترويجية وعروض للمتعلمين.

كيف يمكنني مساعدتك في تطوير English30 اليوم؟`;
        }

        return res.json({ reply });
      }
    } catch (err: any) {
      console.error('Owner AI error:', err);
      return res.status(500).json({ error: 'حدث خطأ في معالجة طلب المالك الذكي' });
    }
  });

  // Serve Vite in development mode
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
