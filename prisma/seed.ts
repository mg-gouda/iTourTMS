import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ── Languages ──
  const languages = [
    { code: "en", name: "English", nameAr: "الإنجليزية", isRTL: false },
    { code: "ar", name: "Arabic", nameAr: "العربية", isRTL: true },
    { code: "fr", name: "French", nameAr: "الفرنسية", isRTL: false },
    { code: "de", name: "German", nameAr: "الألمانية", isRTL: false },
    { code: "tr", name: "Turkish", nameAr: "التركية", isRTL: false },
    { code: "it", name: "Italian", nameAr: "الإيطالية", isRTL: false },
    { code: "es", name: "Spanish", nameAr: "الإسبانية", isRTL: false },
    { code: "ru", name: "Russian", nameAr: "الروسية", isRTL: false },
  ];

  for (const lang of languages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: {},
      create: lang,
    });
  }
  console.log(`  ✓ ${languages.length} languages seeded`);

  // ── Partner Titles ──
  const titles = [
    { name: "Mr.", nameAr: "السيد" },
    { name: "Mrs.", nameAr: "السيدة" },
    { name: "Ms.", nameAr: "الآنسة" },
    { name: "Dr.", nameAr: "دكتور" },
    { name: "Prof.", nameAr: "بروفيسور" },
  ];

  for (const title of titles) {
    await prisma.partnerTitle.upsert({
      where: { name: title.name },
      update: {},
      create: title,
    });
  }
  console.log(`  ✓ ${titles.length} partner titles seeded`);

  // ── Currencies (major world currencies) ──
  const currencies = [
    { code: "USD", name: "US Dollar", nameAr: "دولار أمريكي", symbol: "$", decimals: 2 },
    { code: "EUR", name: "Euro", nameAr: "يورو", symbol: "€", decimals: 2 },
    { code: "GBP", name: "British Pound", nameAr: "جنيه إسترليني", symbol: "£", decimals: 2 },
    { code: "EGP", name: "Egyptian Pound", nameAr: "جنيه مصري", symbol: "ج.م", decimals: 2 },
    { code: "SAR", name: "Saudi Riyal", nameAr: "ريال سعودي", symbol: "ر.س", decimals: 2 },
    { code: "AED", name: "UAE Dirham", nameAr: "درهم إماراتي", symbol: "د.إ", decimals: 2 },
    { code: "TRY", name: "Turkish Lira", nameAr: "ليرة تركية", symbol: "₺", decimals: 2 },
    { code: "RUB", name: "Russian Ruble", nameAr: "روبل روسي", symbol: "₽", decimals: 2 },
    { code: "JPY", name: "Japanese Yen", nameAr: "ين ياباني", symbol: "¥", decimals: 0 },
    { code: "CHF", name: "Swiss Franc", nameAr: "فرنك سويسري", symbol: "CHF", decimals: 2 },
    { code: "CAD", name: "Canadian Dollar", nameAr: "دولار كندي", symbol: "CA$", decimals: 2 },
    { code: "AUD", name: "Australian Dollar", nameAr: "دولار أسترالي", symbol: "A$", decimals: 2 },
    { code: "CNY", name: "Chinese Yuan", nameAr: "يوان صيني", symbol: "¥", decimals: 2 },
    { code: "INR", name: "Indian Rupee", nameAr: "روبية هندية", symbol: "₹", decimals: 2 },
    { code: "KWD", name: "Kuwaiti Dinar", nameAr: "دينار كويتي", symbol: "د.ك", decimals: 3 },
    { code: "BHD", name: "Bahraini Dinar", nameAr: "دينار بحريني", symbol: "د.ب", decimals: 3 },
    { code: "QAR", name: "Qatari Riyal", nameAr: "ريال قطري", symbol: "ر.ق", decimals: 2 },
    { code: "OMR", name: "Omani Rial", nameAr: "ريال عماني", symbol: "ر.ع", decimals: 3 },
    { code: "JOD", name: "Jordanian Dinar", nameAr: "دينار أردني", symbol: "د.أ", decimals: 3 },
    { code: "MAD", name: "Moroccan Dirham", nameAr: "درهم مغربي", symbol: "د.م", decimals: 2 },
    { code: "TND", name: "Tunisian Dinar", nameAr: "دينار تونسي", symbol: "د.ت", decimals: 3 },
    { code: "LBP", name: "Lebanese Pound", nameAr: "ليرة لبنانية", symbol: "ل.ل", decimals: 2 },
    { code: "IQD", name: "Iraqi Dinar", nameAr: "دينار عراقي", symbol: "ع.د", decimals: 3 },
    { code: "SDG", name: "Sudanese Pound", nameAr: "جنيه سوداني", symbol: "ج.س", decimals: 2 },
    { code: "LYD", name: "Libyan Dinar", nameAr: "دينار ليبي", symbol: "د.ل", decimals: 3 },
    { code: "SEK", name: "Swedish Krona", nameAr: "كرونة سويدية", symbol: "kr", decimals: 2 },
    { code: "NOK", name: "Norwegian Krone", nameAr: "كرونة نرويجية", symbol: "kr", decimals: 2 },
    { code: "DKK", name: "Danish Krone", nameAr: "كرونة دنماركية", symbol: "kr", decimals: 2 },
    { code: "PLN", name: "Polish Zloty", nameAr: "زلوتي بولندي", symbol: "zł", decimals: 2 },
    { code: "CZK", name: "Czech Koruna", nameAr: "كرونة تشيكية", symbol: "Kč", decimals: 2 },
    { code: "HUF", name: "Hungarian Forint", nameAr: "فورنت مجري", symbol: "Ft", decimals: 2 },
    { code: "RON", name: "Romanian Leu", nameAr: "ليو روماني", symbol: "lei", decimals: 2 },
    { code: "BGN", name: "Bulgarian Lev", nameAr: "ليف بلغاري", symbol: "лв", decimals: 2 },
    { code: "HRK", name: "Croatian Kuna", nameAr: "كونا كرواتية", symbol: "kn", decimals: 2 },
    { code: "THB", name: "Thai Baht", nameAr: "بات تايلاندي", symbol: "฿", decimals: 2 },
    { code: "MYR", name: "Malaysian Ringgit", nameAr: "رينغيت ماليزي", symbol: "RM", decimals: 2 },
    { code: "SGD", name: "Singapore Dollar", nameAr: "دولار سنغافوري", symbol: "S$", decimals: 2 },
    { code: "KRW", name: "South Korean Won", nameAr: "وون كوري جنوبي", symbol: "₩", decimals: 0 },
    { code: "ZAR", name: "South African Rand", nameAr: "راند جنوب أفريقي", symbol: "R", decimals: 2 },
    { code: "BRL", name: "Brazilian Real", nameAr: "ريال برازيلي", symbol: "R$", decimals: 2 },
    { code: "MXN", name: "Mexican Peso", nameAr: "بيزو مكسيكي", symbol: "MX$", decimals: 2 },
    { code: "NZD", name: "New Zealand Dollar", nameAr: "دولار نيوزيلندي", symbol: "NZ$", decimals: 2 },
    { code: "IDR", name: "Indonesian Rupiah", nameAr: "روبية إندونيسية", symbol: "Rp", decimals: 2 },
    { code: "PHP", name: "Philippine Peso", nameAr: "بيزو فلبيني", symbol: "₱", decimals: 2 },
    { code: "PKR", name: "Pakistani Rupee", nameAr: "روبية باكستانية", symbol: "₨", decimals: 2 },
    { code: "BDT", name: "Bangladeshi Taka", nameAr: "تاكا بنغلاديشية", symbol: "৳", decimals: 2 },
    { code: "VND", name: "Vietnamese Dong", nameAr: "دونغ فيتنامي", symbol: "₫", decimals: 0 },
    { code: "NGN", name: "Nigerian Naira", nameAr: "نيرا نيجيرية", symbol: "₦", decimals: 2 },
    { code: "KES", name: "Kenyan Shilling", nameAr: "شلن كيني", symbol: "KSh", decimals: 2 },
    { code: "GHS", name: "Ghanaian Cedi", nameAr: "سيدي غاني", symbol: "₵", decimals: 2 },
  ];

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: currency,
    });
  }
  console.log(`  ✓ ${currencies.length} currencies seeded`);

  // ── Countries ──
  const countries = [
    { code: "AF", code3: "AFG", name: "Afghanistan", nameAr: "أفغانستان", phone: "+93", continent: "Asia" },
    { code: "AL", code3: "ALB", name: "Albania", nameAr: "ألبانيا", phone: "+355", continent: "Europe" },
    { code: "DZ", code3: "DZA", name: "Algeria", nameAr: "الجزائر", phone: "+213", continent: "Africa" },
    { code: "AD", code3: "AND", name: "Andorra", nameAr: "أندورا", phone: "+376", continent: "Europe" },
    { code: "AO", code3: "AGO", name: "Angola", nameAr: "أنغولا", phone: "+244", continent: "Africa" },
    { code: "AG", code3: "ATG", name: "Antigua and Barbuda", nameAr: "أنتيغوا وبربودا", phone: "+1-268", continent: "North America" },
    { code: "AR", code3: "ARG", name: "Argentina", nameAr: "الأرجنتين", phone: "+54", continent: "South America" },
    { code: "AM", code3: "ARM", name: "Armenia", nameAr: "أرمينيا", phone: "+374", continent: "Asia" },
    { code: "AU", code3: "AUS", name: "Australia", nameAr: "أستراليا", phone: "+61", continent: "Oceania" },
    { code: "AT", code3: "AUT", name: "Austria", nameAr: "النمسا", phone: "+43", continent: "Europe" },
    { code: "AZ", code3: "AZE", name: "Azerbaijan", nameAr: "أذربيجان", phone: "+994", continent: "Asia" },
    { code: "BS", code3: "BHS", name: "Bahamas", nameAr: "الباهاماس", phone: "+1-242", continent: "North America" },
    { code: "BH", code3: "BHR", name: "Bahrain", nameAr: "البحرين", phone: "+973", continent: "Asia" },
    { code: "BD", code3: "BGD", name: "Bangladesh", nameAr: "بنغلاديش", phone: "+880", continent: "Asia" },
    { code: "BB", code3: "BRB", name: "Barbados", nameAr: "بربادوس", phone: "+1-246", continent: "North America" },
    { code: "BY", code3: "BLR", name: "Belarus", nameAr: "بيلاروس", phone: "+375", continent: "Europe" },
    { code: "BE", code3: "BEL", name: "Belgium", nameAr: "بلجيكا", phone: "+32", continent: "Europe" },
    { code: "BZ", code3: "BLZ", name: "Belize", nameAr: "بليز", phone: "+501", continent: "North America" },
    { code: "BJ", code3: "BEN", name: "Benin", nameAr: "بنين", phone: "+229", continent: "Africa" },
    { code: "BT", code3: "BTN", name: "Bhutan", nameAr: "بوتان", phone: "+975", continent: "Asia" },
    { code: "BO", code3: "BOL", name: "Bolivia", nameAr: "بوليفيا", phone: "+591", continent: "South America" },
    { code: "BA", code3: "BIH", name: "Bosnia and Herzegovina", nameAr: "البوسنة والهرسك", phone: "+387", continent: "Europe" },
    { code: "BW", code3: "BWA", name: "Botswana", nameAr: "بوتسوانا", phone: "+267", continent: "Africa" },
    { code: "BR", code3: "BRA", name: "Brazil", nameAr: "البرازيل", phone: "+55", continent: "South America" },
    { code: "BN", code3: "BRN", name: "Brunei", nameAr: "بروناي", phone: "+673", continent: "Asia" },
    { code: "BG", code3: "BGR", name: "Bulgaria", nameAr: "بلغاريا", phone: "+359", continent: "Europe" },
    { code: "BF", code3: "BFA", name: "Burkina Faso", nameAr: "بوركينا فاسو", phone: "+226", continent: "Africa" },
    { code: "BI", code3: "BDI", name: "Burundi", nameAr: "بوروندي", phone: "+257", continent: "Africa" },
    { code: "KH", code3: "KHM", name: "Cambodia", nameAr: "كمبوديا", phone: "+855", continent: "Asia" },
    { code: "CM", code3: "CMR", name: "Cameroon", nameAr: "الكاميرون", phone: "+237", continent: "Africa" },
    { code: "CA", code3: "CAN", name: "Canada", nameAr: "كندا", phone: "+1", continent: "North America" },
    { code: "CV", code3: "CPV", name: "Cape Verde", nameAr: "الرأس الأخضر", phone: "+238", continent: "Africa" },
    { code: "CF", code3: "CAF", name: "Central African Republic", nameAr: "جمهورية أفريقيا الوسطى", phone: "+236", continent: "Africa" },
    { code: "TD", code3: "TCD", name: "Chad", nameAr: "تشاد", phone: "+235", continent: "Africa" },
    { code: "CL", code3: "CHL", name: "Chile", nameAr: "تشيلي", phone: "+56", continent: "South America" },
    { code: "CN", code3: "CHN", name: "China", nameAr: "الصين", phone: "+86", continent: "Asia" },
    { code: "CO", code3: "COL", name: "Colombia", nameAr: "كولومبيا", phone: "+57", continent: "South America" },
    { code: "KM", code3: "COM", name: "Comoros", nameAr: "جزر القمر", phone: "+269", continent: "Africa" },
    { code: "CG", code3: "COG", name: "Congo", nameAr: "الكونغو", phone: "+242", continent: "Africa" },
    { code: "CR", code3: "CRI", name: "Costa Rica", nameAr: "كوستاريكا", phone: "+506", continent: "North America" },
    { code: "HR", code3: "HRV", name: "Croatia", nameAr: "كرواتيا", phone: "+385", continent: "Europe" },
    { code: "CU", code3: "CUB", name: "Cuba", nameAr: "كوبا", phone: "+53", continent: "North America" },
    { code: "CY", code3: "CYP", name: "Cyprus", nameAr: "قبرص", phone: "+357", continent: "Europe" },
    { code: "CZ", code3: "CZE", name: "Czech Republic", nameAr: "التشيك", phone: "+420", continent: "Europe" },
    { code: "DK", code3: "DNK", name: "Denmark", nameAr: "الدنمارك", phone: "+45", continent: "Europe" },
    { code: "DJ", code3: "DJI", name: "Djibouti", nameAr: "جيبوتي", phone: "+253", continent: "Africa" },
    { code: "DO", code3: "DOM", name: "Dominican Republic", nameAr: "جمهورية الدومينيكان", phone: "+1-809", continent: "North America" },
    { code: "EC", code3: "ECU", name: "Ecuador", nameAr: "الإكوادور", phone: "+593", continent: "South America" },
    { code: "EG", code3: "EGY", name: "Egypt", nameAr: "مصر", phone: "+20", continent: "Africa" },
    { code: "SV", code3: "SLV", name: "El Salvador", nameAr: "السلفادور", phone: "+503", continent: "North America" },
    { code: "GQ", code3: "GNQ", name: "Equatorial Guinea", nameAr: "غينيا الاستوائية", phone: "+240", continent: "Africa" },
    { code: "ER", code3: "ERI", name: "Eritrea", nameAr: "إريتريا", phone: "+291", continent: "Africa" },
    { code: "EE", code3: "EST", name: "Estonia", nameAr: "إستونيا", phone: "+372", continent: "Europe" },
    { code: "ET", code3: "ETH", name: "Ethiopia", nameAr: "إثيوبيا", phone: "+251", continent: "Africa" },
    { code: "FI", code3: "FIN", name: "Finland", nameAr: "فنلندا", phone: "+358", continent: "Europe" },
    { code: "FR", code3: "FRA", name: "France", nameAr: "فرنسا", phone: "+33", continent: "Europe" },
    { code: "GA", code3: "GAB", name: "Gabon", nameAr: "الغابون", phone: "+241", continent: "Africa" },
    { code: "GM", code3: "GMB", name: "Gambia", nameAr: "غامبيا", phone: "+220", continent: "Africa" },
    { code: "GE", code3: "GEO", name: "Georgia", nameAr: "جورجيا", phone: "+995", continent: "Asia" },
    { code: "DE", code3: "DEU", name: "Germany", nameAr: "ألمانيا", phone: "+49", continent: "Europe" },
    { code: "GH", code3: "GHA", name: "Ghana", nameAr: "غانا", phone: "+233", continent: "Africa" },
    { code: "GR", code3: "GRC", name: "Greece", nameAr: "اليونان", phone: "+30", continent: "Europe" },
    { code: "GT", code3: "GTM", name: "Guatemala", nameAr: "غواتيمالا", phone: "+502", continent: "North America" },
    { code: "GN", code3: "GIN", name: "Guinea", nameAr: "غينيا", phone: "+224", continent: "Africa" },
    { code: "GY", code3: "GUY", name: "Guyana", nameAr: "غيانا", phone: "+592", continent: "South America" },
    { code: "HT", code3: "HTI", name: "Haiti", nameAr: "هايتي", phone: "+509", continent: "North America" },
    { code: "HN", code3: "HND", name: "Honduras", nameAr: "هندوراس", phone: "+504", continent: "North America" },
    { code: "HU", code3: "HUN", name: "Hungary", nameAr: "المجر", phone: "+36", continent: "Europe" },
    { code: "IS", code3: "ISL", name: "Iceland", nameAr: "أيسلندا", phone: "+354", continent: "Europe" },
    { code: "IN", code3: "IND", name: "India", nameAr: "الهند", phone: "+91", continent: "Asia" },
    { code: "ID", code3: "IDN", name: "Indonesia", nameAr: "إندونيسيا", phone: "+62", continent: "Asia" },
    { code: "IR", code3: "IRN", name: "Iran", nameAr: "إيران", phone: "+98", continent: "Asia" },
    { code: "IQ", code3: "IRQ", name: "Iraq", nameAr: "العراق", phone: "+964", continent: "Asia" },
    { code: "IE", code3: "IRL", name: "Ireland", nameAr: "أيرلندا", phone: "+353", continent: "Europe" },
    { code: "IL", code3: "ISR", name: "Israel", nameAr: "إسرائيل", phone: "+972", continent: "Asia" },
    { code: "IT", code3: "ITA", name: "Italy", nameAr: "إيطاليا", phone: "+39", continent: "Europe" },
    { code: "CI", code3: "CIV", name: "Ivory Coast", nameAr: "ساحل العاج", phone: "+225", continent: "Africa" },
    { code: "JM", code3: "JAM", name: "Jamaica", nameAr: "جامايكا", phone: "+1-876", continent: "North America" },
    { code: "JP", code3: "JPN", name: "Japan", nameAr: "اليابان", phone: "+81", continent: "Asia" },
    { code: "JO", code3: "JOR", name: "Jordan", nameAr: "الأردن", phone: "+962", continent: "Asia" },
    { code: "KZ", code3: "KAZ", name: "Kazakhstan", nameAr: "كازاخستان", phone: "+7", continent: "Asia" },
    { code: "KE", code3: "KEN", name: "Kenya", nameAr: "كينيا", phone: "+254", continent: "Africa" },
    { code: "KW", code3: "KWT", name: "Kuwait", nameAr: "الكويت", phone: "+965", continent: "Asia" },
    { code: "KG", code3: "KGZ", name: "Kyrgyzstan", nameAr: "قيرغيزستان", phone: "+996", continent: "Asia" },
    { code: "LA", code3: "LAO", name: "Laos", nameAr: "لاوس", phone: "+856", continent: "Asia" },
    { code: "LV", code3: "LVA", name: "Latvia", nameAr: "لاتفيا", phone: "+371", continent: "Europe" },
    { code: "LB", code3: "LBN", name: "Lebanon", nameAr: "لبنان", phone: "+961", continent: "Asia" },
    { code: "LS", code3: "LSO", name: "Lesotho", nameAr: "ليسوتو", phone: "+266", continent: "Africa" },
    { code: "LR", code3: "LBR", name: "Liberia", nameAr: "ليبيريا", phone: "+231", continent: "Africa" },
    { code: "LY", code3: "LBY", name: "Libya", nameAr: "ليبيا", phone: "+218", continent: "Africa" },
    { code: "LI", code3: "LIE", name: "Liechtenstein", nameAr: "ليختنشتاين", phone: "+423", continent: "Europe" },
    { code: "LT", code3: "LTU", name: "Lithuania", nameAr: "ليتوانيا", phone: "+370", continent: "Europe" },
    { code: "LU", code3: "LUX", name: "Luxembourg", nameAr: "لوكسمبورغ", phone: "+352", continent: "Europe" },
    { code: "MG", code3: "MDG", name: "Madagascar", nameAr: "مدغشقر", phone: "+261", continent: "Africa" },
    { code: "MW", code3: "MWI", name: "Malawi", nameAr: "مالاوي", phone: "+265", continent: "Africa" },
    { code: "MY", code3: "MYS", name: "Malaysia", nameAr: "ماليزيا", phone: "+60", continent: "Asia" },
    { code: "MV", code3: "MDV", name: "Maldives", nameAr: "المالديف", phone: "+960", continent: "Asia" },
    { code: "ML", code3: "MLI", name: "Mali", nameAr: "مالي", phone: "+223", continent: "Africa" },
    { code: "MT", code3: "MLT", name: "Malta", nameAr: "مالطا", phone: "+356", continent: "Europe" },
    { code: "MR", code3: "MRT", name: "Mauritania", nameAr: "موريتانيا", phone: "+222", continent: "Africa" },
    { code: "MU", code3: "MUS", name: "Mauritius", nameAr: "موريشيوس", phone: "+230", continent: "Africa" },
    { code: "MX", code3: "MEX", name: "Mexico", nameAr: "المكسيك", phone: "+52", continent: "North America" },
    { code: "MD", code3: "MDA", name: "Moldova", nameAr: "مولدوفا", phone: "+373", continent: "Europe" },
    { code: "MC", code3: "MCO", name: "Monaco", nameAr: "موناكو", phone: "+377", continent: "Europe" },
    { code: "MN", code3: "MNG", name: "Mongolia", nameAr: "منغوليا", phone: "+976", continent: "Asia" },
    { code: "ME", code3: "MNE", name: "Montenegro", nameAr: "الجبل الأسود", phone: "+382", continent: "Europe" },
    { code: "MA", code3: "MAR", name: "Morocco", nameAr: "المغرب", phone: "+212", continent: "Africa" },
    { code: "MZ", code3: "MOZ", name: "Mozambique", nameAr: "موزمبيق", phone: "+258", continent: "Africa" },
    { code: "MM", code3: "MMR", name: "Myanmar", nameAr: "ميانمار", phone: "+95", continent: "Asia" },
    { code: "NA", code3: "NAM", name: "Namibia", nameAr: "ناميبيا", phone: "+264", continent: "Africa" },
    { code: "NP", code3: "NPL", name: "Nepal", nameAr: "نيبال", phone: "+977", continent: "Asia" },
    { code: "NL", code3: "NLD", name: "Netherlands", nameAr: "هولندا", phone: "+31", continent: "Europe" },
    { code: "NZ", code3: "NZL", name: "New Zealand", nameAr: "نيوزيلندا", phone: "+64", continent: "Oceania" },
    { code: "NI", code3: "NIC", name: "Nicaragua", nameAr: "نيكاراغوا", phone: "+505", continent: "North America" },
    { code: "NE", code3: "NER", name: "Niger", nameAr: "النيجر", phone: "+227", continent: "Africa" },
    { code: "NG", code3: "NGA", name: "Nigeria", nameAr: "نيجيريا", phone: "+234", continent: "Africa" },
    { code: "MK", code3: "MKD", name: "North Macedonia", nameAr: "مقدونيا الشمالية", phone: "+389", continent: "Europe" },
    { code: "NO", code3: "NOR", name: "Norway", nameAr: "النرويج", phone: "+47", continent: "Europe" },
    { code: "OM", code3: "OMN", name: "Oman", nameAr: "عُمان", phone: "+968", continent: "Asia" },
    { code: "PK", code3: "PAK", name: "Pakistan", nameAr: "باكستان", phone: "+92", continent: "Asia" },
    { code: "PS", code3: "PSE", name: "Palestine", nameAr: "فلسطين", phone: "+970", continent: "Asia" },
    { code: "PA", code3: "PAN", name: "Panama", nameAr: "بنما", phone: "+507", continent: "North America" },
    { code: "PG", code3: "PNG", name: "Papua New Guinea", nameAr: "بابوا غينيا الجديدة", phone: "+675", continent: "Oceania" },
    { code: "PY", code3: "PRY", name: "Paraguay", nameAr: "باراغواي", phone: "+595", continent: "South America" },
    { code: "PE", code3: "PER", name: "Peru", nameAr: "بيرو", phone: "+51", continent: "South America" },
    { code: "PH", code3: "PHL", name: "Philippines", nameAr: "الفلبين", phone: "+63", continent: "Asia" },
    { code: "PL", code3: "POL", name: "Poland", nameAr: "بولندا", phone: "+48", continent: "Europe" },
    { code: "PT", code3: "PRT", name: "Portugal", nameAr: "البرتغال", phone: "+351", continent: "Europe" },
    { code: "QA", code3: "QAT", name: "Qatar", nameAr: "قطر", phone: "+974", continent: "Asia" },
    { code: "RO", code3: "ROU", name: "Romania", nameAr: "رومانيا", phone: "+40", continent: "Europe" },
    { code: "RU", code3: "RUS", name: "Russia", nameAr: "روسيا", phone: "+7", continent: "Europe" },
    { code: "RW", code3: "RWA", name: "Rwanda", nameAr: "رواندا", phone: "+250", continent: "Africa" },
    { code: "SA", code3: "SAU", name: "Saudi Arabia", nameAr: "المملكة العربية السعودية", phone: "+966", continent: "Asia" },
    { code: "SN", code3: "SEN", name: "Senegal", nameAr: "السنغال", phone: "+221", continent: "Africa" },
    { code: "RS", code3: "SRB", name: "Serbia", nameAr: "صربيا", phone: "+381", continent: "Europe" },
    { code: "SL", code3: "SLE", name: "Sierra Leone", nameAr: "سيراليون", phone: "+232", continent: "Africa" },
    { code: "SG", code3: "SGP", name: "Singapore", nameAr: "سنغافورة", phone: "+65", continent: "Asia" },
    { code: "SK", code3: "SVK", name: "Slovakia", nameAr: "سلوفاكيا", phone: "+421", continent: "Europe" },
    { code: "SI", code3: "SVN", name: "Slovenia", nameAr: "سلوفينيا", phone: "+386", continent: "Europe" },
    { code: "SO", code3: "SOM", name: "Somalia", nameAr: "الصومال", phone: "+252", continent: "Africa" },
    { code: "ZA", code3: "ZAF", name: "South Africa", nameAr: "جنوب أفريقيا", phone: "+27", continent: "Africa" },
    { code: "KR", code3: "KOR", name: "South Korea", nameAr: "كوريا الجنوبية", phone: "+82", continent: "Asia" },
    { code: "SS", code3: "SSD", name: "South Sudan", nameAr: "جنوب السودان", phone: "+211", continent: "Africa" },
    { code: "ES", code3: "ESP", name: "Spain", nameAr: "إسبانيا", phone: "+34", continent: "Europe" },
    { code: "LK", code3: "LKA", name: "Sri Lanka", nameAr: "سريلانكا", phone: "+94", continent: "Asia" },
    { code: "SD", code3: "SDN", name: "Sudan", nameAr: "السودان", phone: "+249", continent: "Africa" },
    { code: "SR", code3: "SUR", name: "Suriname", nameAr: "سورينام", phone: "+597", continent: "South America" },
    { code: "SE", code3: "SWE", name: "Sweden", nameAr: "السويد", phone: "+46", continent: "Europe" },
    { code: "CH", code3: "CHE", name: "Switzerland", nameAr: "سويسرا", phone: "+41", continent: "Europe" },
    { code: "SY", code3: "SYR", name: "Syria", nameAr: "سوريا", phone: "+963", continent: "Asia" },
    { code: "TW", code3: "TWN", name: "Taiwan", nameAr: "تايوان", phone: "+886", continent: "Asia" },
    { code: "TJ", code3: "TJK", name: "Tajikistan", nameAr: "طاجيكستان", phone: "+992", continent: "Asia" },
    { code: "TZ", code3: "TZA", name: "Tanzania", nameAr: "تنزانيا", phone: "+255", continent: "Africa" },
    { code: "TH", code3: "THA", name: "Thailand", nameAr: "تايلاند", phone: "+66", continent: "Asia" },
    { code: "TG", code3: "TGO", name: "Togo", nameAr: "توغو", phone: "+228", continent: "Africa" },
    { code: "TT", code3: "TTO", name: "Trinidad and Tobago", nameAr: "ترينيداد وتوباغو", phone: "+1-868", continent: "North America" },
    { code: "TN", code3: "TUN", name: "Tunisia", nameAr: "تونس", phone: "+216", continent: "Africa" },
    { code: "TR", code3: "TUR", name: "Turkey", nameAr: "تركيا", phone: "+90", continent: "Europe" },
    { code: "TM", code3: "TKM", name: "Turkmenistan", nameAr: "تركمانستان", phone: "+993", continent: "Asia" },
    { code: "UG", code3: "UGA", name: "Uganda", nameAr: "أوغندا", phone: "+256", continent: "Africa" },
    { code: "UA", code3: "UKR", name: "Ukraine", nameAr: "أوكرانيا", phone: "+380", continent: "Europe" },
    { code: "AE", code3: "ARE", name: "United Arab Emirates", nameAr: "الإمارات العربية المتحدة", phone: "+971", continent: "Asia" },
    { code: "GB", code3: "GBR", name: "United Kingdom", nameAr: "المملكة المتحدة", phone: "+44", continent: "Europe" },
    { code: "US", code3: "USA", name: "United States", nameAr: "الولايات المتحدة", phone: "+1", continent: "North America" },
    { code: "UY", code3: "URY", name: "Uruguay", nameAr: "أوروغواي", phone: "+598", continent: "South America" },
    { code: "UZ", code3: "UZB", name: "Uzbekistan", nameAr: "أوزبكستان", phone: "+998", continent: "Asia" },
    { code: "VE", code3: "VEN", name: "Venezuela", nameAr: "فنزويلا", phone: "+58", continent: "South America" },
    { code: "VN", code3: "VNM", name: "Vietnam", nameAr: "فيتنام", phone: "+84", continent: "Asia" },
    { code: "YE", code3: "YEM", name: "Yemen", nameAr: "اليمن", phone: "+967", continent: "Asia" },
    { code: "ZM", code3: "ZMB", name: "Zambia", nameAr: "زامبيا", phone: "+260", continent: "Africa" },
    { code: "ZW", code3: "ZWE", name: "Zimbabwe", nameAr: "زيمبابوي", phone: "+263", continent: "Africa" },
  ];

  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: {},
      create: country,
    });
  }
  console.log(`  ✓ ${countries.length} countries seeded`);

  console.log("\nSeed completed successfully!");
}

// ── Finance seed data — called per-company when finance module is installed ──

export async function seedFinance(companyId: string) {
  console.log("  Seeding finance data...");

  // ── Permissions ──
  const financePermissions = [
    { code: "finance:account:read", module: "finance", resource: "account", action: "read", displayName: "View Accounts" },
    { code: "finance:account:create", module: "finance", resource: "account", action: "create", displayName: "Create Accounts" },
    { code: "finance:account:update", module: "finance", resource: "account", action: "update", displayName: "Update Accounts" },
    { code: "finance:account:delete", module: "finance", resource: "account", action: "delete", displayName: "Delete Accounts" },
    { code: "finance:journal:read", module: "finance", resource: "journal", action: "read", displayName: "View Journals" },
    { code: "finance:journal:create", module: "finance", resource: "journal", action: "create", displayName: "Create Journals" },
    { code: "finance:journal:update", module: "finance", resource: "journal", action: "update", displayName: "Update Journals" },
    { code: "finance:journal:delete", module: "finance", resource: "journal", action: "delete", displayName: "Delete Journals" },
    { code: "finance:tax:read", module: "finance", resource: "tax", action: "read", displayName: "View Taxes" },
    { code: "finance:tax:create", module: "finance", resource: "tax", action: "create", displayName: "Create Taxes" },
    { code: "finance:tax:update", module: "finance", resource: "tax", action: "update", displayName: "Update Taxes" },
    { code: "finance:tax:delete", module: "finance", resource: "tax", action: "delete", displayName: "Delete Taxes" },
    { code: "finance:paymentTerm:read", module: "finance", resource: "paymentTerm", action: "read", displayName: "View Payment Terms" },
    { code: "finance:paymentTerm:create", module: "finance", resource: "paymentTerm", action: "create", displayName: "Create Payment Terms" },
    { code: "finance:paymentTerm:update", module: "finance", resource: "paymentTerm", action: "update", displayName: "Update Payment Terms" },
    { code: "finance:paymentTerm:delete", module: "finance", resource: "paymentTerm", action: "delete", displayName: "Delete Payment Terms" },
    { code: "finance:settings:manage", module: "finance", resource: "settings", action: "manage", displayName: "Manage Finance Settings" },
  ];

  for (const perm of financePermissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }
  console.log(`    ✓ ${financePermissions.length} finance permissions seeded`);

  // ── Roles ──
  const managerRole = await prisma.role.upsert({
    where: { name_companyId: { name: "finance_manager", companyId } },
    update: {},
    create: {
      name: "finance_manager",
      displayName: "Finance Manager",
      description: "Full access to all finance module features",
      isSystem: true,
      companyId,
    },
  });

  const accountantRole = await prisma.role.upsert({
    where: { name_companyId: { name: "finance_accountant", companyId } },
    update: {},
    create: {
      name: "finance_accountant",
      displayName: "Finance Accountant",
      description: "Read/create access to finance operations, no delete",
      isSystem: true,
      companyId,
    },
  });

  // Assign all finance perms to manager
  const allPerms = await prisma.permission.findMany({
    where: { module: "finance" },
  });
  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: managerRole.id, permissionId: perm.id },
    });
  }

  // Assign read + create perms to accountant
  const accountantPerms = allPerms.filter(
    (p) => p.action === "read" || p.action === "create",
  );
  for (const perm of accountantPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: accountantRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: accountantRole.id, permissionId: perm.id },
    });
  }
  console.log("    ✓ finance_manager and finance_accountant roles seeded");

  // ── Account Groups ──
  const groups = [
    { name: "Assets", codePrefixStart: "1000", codePrefixEnd: "1999", companyId },
    { name: "Liabilities", codePrefixStart: "2000", codePrefixEnd: "2999", companyId },
    { name: "Equity", codePrefixStart: "3000", codePrefixEnd: "3999", companyId },
    { name: "Income", codePrefixStart: "4000", codePrefixEnd: "4999", companyId },
    { name: "Expenses", codePrefixStart: "5000", codePrefixEnd: "6999", companyId },
  ];

  const groupMap: Record<string, string> = {};
  for (const g of groups) {
    const created = await prisma.accountGroup.upsert({
      where: { name_companyId: { name: g.name, companyId } },
      update: {},
      create: g,
    });
    groupMap[g.name] = created.id;
  }
  console.log(`    ✓ ${groups.length} account groups seeded`);

  // ── Chart of Accounts ──
  const accounts = [
    // Assets
    { code: "1100", name: "Accounts Receivable", accountType: "ASSET_RECEIVABLE", reconcile: true, groupId: groupMap["Assets"] },
    { code: "1200", name: "Bank Account", accountType: "ASSET_CASH", reconcile: true, groupId: groupMap["Assets"] },
    { code: "1210", name: "Cash on Hand", accountType: "ASSET_CASH", reconcile: false, groupId: groupMap["Assets"] },
    { code: "1300", name: "Prepaid Expenses", accountType: "ASSET_PREPAYMENTS", reconcile: false, groupId: groupMap["Assets"] },
    { code: "1400", name: "Inventory", accountType: "ASSET_CURRENT", reconcile: false, groupId: groupMap["Assets"] },
    { code: "1500", name: "Office Equipment", accountType: "ASSET_FIXED", reconcile: false, groupId: groupMap["Assets"] },
    { code: "1510", name: "Furniture & Fixtures", accountType: "ASSET_FIXED", reconcile: false, groupId: groupMap["Assets"] },
    { code: "1520", name: "Computer Equipment", accountType: "ASSET_FIXED", reconcile: false, groupId: groupMap["Assets"] },
    { code: "1530", name: "Vehicles", accountType: "ASSET_FIXED", reconcile: false, groupId: groupMap["Assets"] },
    { code: "1600", name: "Accumulated Depreciation", accountType: "ASSET_FIXED", reconcile: false, groupId: groupMap["Assets"] },
    { code: "1700", name: "Other Current Assets", accountType: "ASSET_CURRENT", reconcile: false, groupId: groupMap["Assets"] },
    { code: "1800", name: "Other Non-Current Assets", accountType: "ASSET_NON_CURRENT", reconcile: false, groupId: groupMap["Assets"] },
    // Liabilities
    { code: "2100", name: "Accounts Payable", accountType: "LIABILITY_PAYABLE", reconcile: true, groupId: groupMap["Liabilities"] },
    { code: "2200", name: "Credit Card", accountType: "LIABILITY_CREDIT_CARD", reconcile: true, groupId: groupMap["Liabilities"] },
    { code: "2300", name: "Accrued Expenses", accountType: "LIABILITY_CURRENT", reconcile: false, groupId: groupMap["Liabilities"] },
    { code: "2400", name: "VAT Payable", accountType: "LIABILITY_CURRENT", reconcile: false, groupId: groupMap["Liabilities"] },
    { code: "2410", name: "VAT Receivable", accountType: "ASSET_CURRENT", reconcile: false, groupId: groupMap["Assets"] },
    { code: "2500", name: "Unearned Revenue", accountType: "LIABILITY_CURRENT", reconcile: false, groupId: groupMap["Liabilities"] },
    { code: "2600", name: "Short-Term Loans", accountType: "LIABILITY_CURRENT", reconcile: true, groupId: groupMap["Liabilities"] },
    { code: "2700", name: "Long-Term Loans", accountType: "LIABILITY_NON_CURRENT", reconcile: true, groupId: groupMap["Liabilities"] },
    // Equity
    { code: "3000", name: "Share Capital", accountType: "EQUITY", reconcile: false, groupId: groupMap["Equity"] },
    { code: "3100", name: "Retained Earnings", accountType: "EQUITY", reconcile: false, groupId: groupMap["Equity"] },
    { code: "3200", name: "Current Year Earnings", accountType: "EQUITY_UNAFFECTED", reconcile: false, groupId: groupMap["Equity"] },
    // Income
    { code: "4000", name: "Sales Revenue", accountType: "INCOME", reconcile: false, groupId: groupMap["Income"] },
    { code: "4100", name: "Service Revenue", accountType: "INCOME", reconcile: false, groupId: groupMap["Income"] },
    { code: "4200", name: "Tour Package Revenue", accountType: "INCOME", reconcile: false, groupId: groupMap["Income"] },
    { code: "4300", name: "Hotel Booking Commission", accountType: "INCOME", reconcile: false, groupId: groupMap["Income"] },
    { code: "4400", name: "Transport Revenue", accountType: "INCOME", reconcile: false, groupId: groupMap["Income"] },
    { code: "4500", name: "Visa Processing Fees", accountType: "INCOME", reconcile: false, groupId: groupMap["Income"] },
    { code: "4900", name: "Other Income", accountType: "INCOME_OTHER", reconcile: false, groupId: groupMap["Income"] },
    { code: "4910", name: "Interest Income", accountType: "INCOME_OTHER", reconcile: false, groupId: groupMap["Income"] },
    { code: "4920", name: "Foreign Exchange Gain", accountType: "INCOME_OTHER", reconcile: false, groupId: groupMap["Income"] },
    // Expenses
    { code: "5000", name: "Cost of Goods Sold", accountType: "EXPENSE_DIRECT_COST", reconcile: false, groupId: groupMap["Expenses"] },
    { code: "5100", name: "Hotel Costs", accountType: "EXPENSE_DIRECT_COST", reconcile: false, groupId: groupMap["Expenses"] },
    { code: "5200", name: "Transport Costs", accountType: "EXPENSE_DIRECT_COST", reconcile: false, groupId: groupMap["Expenses"] },
    { code: "5300", name: "Guide & Excursion Costs", accountType: "EXPENSE_DIRECT_COST", reconcile: false, groupId: groupMap["Expenses"] },
    { code: "6000", name: "Salaries & Wages", accountType: "EXPENSE", reconcile: false, groupId: groupMap["Expenses"] },
    { code: "6100", name: "Rent Expense", accountType: "EXPENSE", reconcile: false, groupId: groupMap["Expenses"] },
    { code: "6200", name: "Utilities", accountType: "EXPENSE", reconcile: false, groupId: groupMap["Expenses"] },
    { code: "6300", name: "Office Supplies", accountType: "EXPENSE", reconcile: false, groupId: groupMap["Expenses"] },
    { code: "6400", name: "Marketing & Advertising", accountType: "EXPENSE", reconcile: false, groupId: groupMap["Expenses"] },
    { code: "6500", name: "Insurance Expense", accountType: "EXPENSE", reconcile: false, groupId: groupMap["Expenses"] },
    { code: "6600", name: "Depreciation Expense", accountType: "EXPENSE_DEPRECIATION", reconcile: false, groupId: groupMap["Expenses"] },
    { code: "6700", name: "Bank Charges", accountType: "EXPENSE", reconcile: false, groupId: groupMap["Expenses"] },
    { code: "6800", name: "Foreign Exchange Loss", accountType: "EXPENSE", reconcile: false, groupId: groupMap["Expenses"] },
    { code: "6900", name: "Miscellaneous Expenses", accountType: "EXPENSE", reconcile: false, groupId: groupMap["Expenses"] },
  ];

  const accountMap: Record<string, string> = {};
  for (const acc of accounts) {
    const created = await prisma.finAccount.upsert({
      where: { code_companyId: { code: acc.code, companyId } },
      update: {},
      create: { ...acc, companyId, deprecated: false } as any,
    });
    accountMap[acc.code] = created.id;
  }
  console.log(`    ✓ ${accounts.length} accounts seeded`);

  // ── Journals ──
  const journals = [
    { code: "SAJ", name: "Sales Journal", type: "SALE", defaultAccountId: accountMap["1100"] },
    { code: "EXJ", name: "Purchase Journal", type: "PURCHASE", defaultAccountId: accountMap["2100"] },
    { code: "BNK1", name: "Bank", type: "BANK", defaultAccountId: accountMap["1200"] },
    { code: "CSH1", name: "Cash", type: "CASH", defaultAccountId: accountMap["1210"] },
    { code: "MISC", name: "Miscellaneous Operations", type: "GENERAL" },
    { code: "EXCH", name: "Exchange Difference", type: "GENERAL", defaultAccountId: accountMap["4920"] },
  ];

  for (const j of journals) {
    await prisma.journal.upsert({
      where: { code_companyId: { code: j.code, companyId } },
      update: {},
      create: { ...j, companyId } as any,
    });
  }
  console.log(`    ✓ ${journals.length} journals seeded`);

  // ── Tax Group ──
  const vatGroup = await prisma.taxGroup.create({
    data: { name: "VAT", sequence: 10, companyId },
  });

  // ── Taxes ──
  const vatSale = await prisma.tax.create({
    data: {
      name: "VAT 14% (Sales)",
      typeTaxUse: "SALE",
      amountType: "PERCENT",
      amount: 14,
      priceInclude: false,
      includeBaseAmount: false,
      isActive: true,
      sequence: 10,
      companyId,
      taxGroupId: vatGroup.id,
      repartitionLines: {
        create: [
          { factorPercent: 100, accountId: accountMap["2400"], useInTaxClosing: true, documentType: "INVOICE", sequence: 10 },
          { factorPercent: 100, accountId: accountMap["2400"], useInTaxClosing: true, documentType: "REFUND", sequence: 20 },
        ],
      },
    },
  });

  const vatPurchase = await prisma.tax.create({
    data: {
      name: "VAT 14% (Purchases)",
      typeTaxUse: "PURCHASE",
      amountType: "PERCENT",
      amount: 14,
      priceInclude: false,
      includeBaseAmount: false,
      isActive: true,
      sequence: 20,
      companyId,
      taxGroupId: vatGroup.id,
      repartitionLines: {
        create: [
          { factorPercent: 100, accountId: accountMap["2410"], useInTaxClosing: true, documentType: "INVOICE", sequence: 10 },
          { factorPercent: 100, accountId: accountMap["2410"], useInTaxClosing: true, documentType: "REFUND", sequence: 20 },
        ],
      },
    },
  });
  console.log("    ✓ Tax group (VAT) and 2 taxes seeded");

  // ── Payment Terms ──
  const paymentTerms = [
    {
      name: "Immediate Payment",
      lines: [{ valueType: "BALANCE", valueAmount: 0, nbDays: 0, delayType: "DAYS_AFTER", sequence: 10 }],
    },
    {
      name: "Net 30",
      lines: [{ valueType: "BALANCE", valueAmount: 0, nbDays: 30, delayType: "DAYS_AFTER", sequence: 10 }],
    },
    {
      name: "Net 60",
      lines: [{ valueType: "BALANCE", valueAmount: 0, nbDays: 60, delayType: "DAYS_AFTER", sequence: 10 }],
    },
    {
      name: "2/10 Net 30",
      earlyDiscount: true,
      discountPercent: 2,
      discountDays: 10,
      lines: [{ valueType: "BALANCE", valueAmount: 0, nbDays: 30, delayType: "DAYS_AFTER", sequence: 10 }],
    },
  ];

  for (const pt of paymentTerms) {
    const { lines, ...data } = pt;
    await prisma.paymentTerm.create({
      data: {
        ...data,
        companyId,
        lines: { create: lines as any },
      },
    });
  }
  console.log(`    ✓ ${paymentTerms.length} payment terms seeded`);

  console.log("  ✓ Finance seed completed");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
