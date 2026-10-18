/**
 * Site translation through Google Translate.
 *
 * The site is written in English. When a shopper picks another language we
 * load Google's translate script (only then, never for English) and point it
 * at that language; it translates everything on the page, product names and
 * descriptions included, and keeps translating as pages change. Picking
 * English again clears the choice and reloads the original text.
 */

/* [code, English name, name in that language]. Codes are Google's. */
export const LANGUAGES = [
  ['en', 'English', 'English'],
  ['ur', 'Urdu', 'اردو'],
  ['ar', 'Arabic', 'العربية'],
  ['pa', 'Punjabi', 'ਪੰਜਾਬੀ'],
  ['ps', 'Pashto', 'پښتو'],
  ['sd', 'Sindhi', 'سنڌي'],
  ['hi', 'Hindi', 'हिन्दी'],
  ['bn', 'Bengali', 'বাংলা'],
  ['fa', 'Persian', 'فارسی'],
  ['tr', 'Turkish', 'Türkçe'],
  ['zh-CN', 'Chinese (Simplified)', '简体中文'],
  ['zh-TW', 'Chinese (Traditional)', '繁體中文'],
  ['ja', 'Japanese', '日本語'],
  ['ko', 'Korean', '한국어'],
  ['fr', 'French', 'Français'],
  ['de', 'German', 'Deutsch'],
  ['es', 'Spanish', 'Español'],
  ['pt', 'Portuguese', 'Português'],
  ['it', 'Italian', 'Italiano'],
  ['ru', 'Russian', 'Русский'],
  ['nl', 'Dutch', 'Nederlands'],
  ['sv', 'Swedish', 'Svenska'],
  ['no', 'Norwegian', 'Norsk'],
  ['da', 'Danish', 'Dansk'],
  ['fi', 'Finnish', 'Suomi'],
  ['pl', 'Polish', 'Polski'],
  ['cs', 'Czech', 'Čeština'],
  ['sk', 'Slovak', 'Slovenčina'],
  ['sl', 'Slovenian', 'Slovenščina'],
  ['hu', 'Hungarian', 'Magyar'],
  ['ro', 'Romanian', 'Română'],
  ['bg', 'Bulgarian', 'Български'],
  ['el', 'Greek', 'Ελληνικά'],
  ['uk', 'Ukrainian', 'Українська'],
  ['be', 'Belarusian', 'Беларуская'],
  ['sr', 'Serbian', 'Српски'],
  ['hr', 'Croatian', 'Hrvatski'],
  ['bs', 'Bosnian', 'Bosanski'],
  ['mk', 'Macedonian', 'Македонски'],
  ['sq', 'Albanian', 'Shqip'],
  ['lt', 'Lithuanian', 'Lietuvių'],
  ['lv', 'Latvian', 'Latviešu'],
  ['et', 'Estonian', 'Eesti'],
  ['iw', 'Hebrew', 'עברית'],
  ['yi', 'Yiddish', 'ייִדיש'],
  ['id', 'Indonesian', 'Bahasa Indonesia'],
  ['ms', 'Malay', 'Bahasa Melayu'],
  ['jw', 'Javanese', 'Basa Jawa'],
  ['su', 'Sundanese', 'Basa Sunda'],
  ['tl', 'Filipino', 'Filipino'],
  ['ceb', 'Cebuano', 'Cebuano'],
  ['th', 'Thai', 'ไทย'],
  ['vi', 'Vietnamese', 'Tiếng Việt'],
  ['km', 'Khmer', 'ខ្មែរ'],
  ['lo', 'Lao', 'ລາວ'],
  ['my', 'Burmese', 'မြန်မာ'],
  ['ne', 'Nepali', 'नेपाली'],
  ['si', 'Sinhala', 'සිංහල'],
  ['ta', 'Tamil', 'தமிழ்'],
  ['te', 'Telugu', 'తెలుగు'],
  ['ml', 'Malayalam', 'മലയാളം'],
  ['kn', 'Kannada', 'ಕನ್ನಡ'],
  ['mr', 'Marathi', 'मराठी'],
  ['gu', 'Gujarati', 'ગુજરાતી'],
  ['or', 'Odia', 'ଓଡ଼ିଆ'],
  ['az', 'Azerbaijani', 'Azərbaycan'],
  ['kk', 'Kazakh', 'Қазақ'],
  ['uz', 'Uzbek', 'Oʻzbek'],
  ['ky', 'Kyrgyz', 'Кыргызча'],
  ['tg', 'Tajik', 'Тоҷикӣ'],
  ['tk', 'Turkmen', 'Türkmen'],
  ['mn', 'Mongolian', 'Монгол'],
  ['ka', 'Georgian', 'ქართული'],
  ['hy', 'Armenian', 'Հայերեն'],
  ['ku', 'Kurdish (Kurmanji)', 'Kurdî'],
  ['ckb', 'Kurdish (Sorani)', 'کوردی'],
  ['ug', 'Uyghur', 'ئۇيغۇرچە'],
  ['sw', 'Swahili', 'Kiswahili'],
  ['am', 'Amharic', 'አማርኛ'],
  ['so', 'Somali', 'Soomaali'],
  ['ha', 'Hausa', 'Hausa'],
  ['yo', 'Yoruba', 'Yorùbá'],
  ['ig', 'Igbo', 'Igbo'],
  ['zu', 'Zulu', 'isiZulu'],
  ['xh', 'Xhosa', 'isiXhosa'],
  ['af', 'Afrikaans', 'Afrikaans'],
  ['mg', 'Malagasy', 'Malagasy'],
  ['ga', 'Irish', 'Gaeilge'],
  ['cy', 'Welsh', 'Cymraeg'],
  ['gd', 'Scottish Gaelic', 'Gàidhlig'],
  ['is', 'Icelandic', 'Íslenska'],
  ['mt', 'Maltese', 'Malti'],
  ['eu', 'Basque', 'Euskara'],
  ['ca', 'Catalan', 'Català'],
  ['gl', 'Galician', 'Galego'],
  ['lb', 'Luxembourgish', 'Lëtzebuergesch'],
  ['la', 'Latin', 'Latina'],
  ['eo', 'Esperanto', 'Esperanto'],
];

const RTL = new Set(['ar', 'ur', 'fa', 'ps', 'sd', 'iw', 'yi', 'ug', 'ckb']);
export const isRtl = (code) => RTL.has(code);
export const languageName = (code) => LANGUAGES.find(([c]) => c === code) || ['en', 'English', 'English'];

const readCookie = () => {
  const m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
  return m ? decodeURIComponent(m[1]).split('/').pop() : '';
};

/** The language chosen last time, from Google's own cookie. */
export const loadLang = () => {
  try {
    return readCookie() || 'en';
  } catch {
    return 'en';
  }
};

function writeCookie(lang) {
  const host = window.location.hostname;
  const domains = ['', host, host.includes('.') ? `.${host.split('.').slice(-2).join('.')}` : ''].filter((d, i, a) => a.indexOf(d) === i);
  for (const d of domains) {
    const dom = d ? `;domain=${d}` : '';
    document.cookie = lang
      ? `googtrans=/en/${lang};path=/${dom}`
      : `googtrans=;path=/${dom};expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

let loading = null;
function loadScript() {
  if (window.google?.translate?.TranslateElement) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    let host = document.getElementById('google_translate_element');
    if (!host) {
      host = document.createElement('div');
      host.id = 'google_translate_element';
      host.style.display = 'none';
      document.body.appendChild(host);
    }
    window.googleTranslateElementInit = () => {
      // eslint-disable-next-line no-new
      new window.google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element');
      resolve();
    };
    const s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error('Translation is unavailable right now'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** Waits for Google's hidden language menu, then selects `lang` in it. */
function pickInWidget(lang) {
  return new Promise((resolve) => {
    let tries = 0;
    const tick = () => {
      const combo = document.querySelector('select.goog-te-combo');
      if (combo && combo.options.length > 1) {
        combo.value = lang;
        combo.dispatchEvent(new Event('change'));
        resolve(true);
      } else if (tries++ < 60) setTimeout(tick, 150);
      else resolve(false);
    };
    tick();
  });
}

function setDirection(lang) {
  document.documentElement.lang = lang === 'iw' ? 'he' : lang;
  document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
}

/**
 * Switches the whole site to `lang`. Returns a promise that rejects if
 * Google's script cannot be reached (offline, or blocked).
 */
export async function applyLanguage(lang) {
  if (!lang || lang === 'en') {
    const wasTranslated = Boolean(readCookie()) || document.documentElement.classList.contains('translated-ltr') || document.documentElement.classList.contains('translated-rtl');
    writeCookie('');
    setDirection('en');
    // Only a reload brings back the original English text reliably.
    if (wasTranslated) window.location.reload();
    return;
  }
  writeCookie(lang);
  setDirection(lang);
  await loadScript();
  await pickInWidget(lang);
}

/** Called once at start-up: carry on in the language chosen last time. */
export function resumeLanguage() {
  const lang = loadLang();
  if (lang && lang !== 'en') {
    setDirection(lang);
    loadScript().catch(() => {});
  }
}
