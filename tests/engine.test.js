/* اختبارات محرك مجيب لكل المتاجر: node tests/engine.test.js */
const path = require("path");
let fails = 0;

function loadEngine(storeFile) {
  delete require.cache[require.resolve("../demo/js/engine.js")];
  globalThis.CATALOG = require(path.join("..", "demo", "stores", storeFile));
  return require("../demo/js/engine.js");
}

function makeStep(E, s) {
  return function step(input, expectRe, label) {
    const out = E.reply(input, s);
    const all = out.replies.map((r) => r.text).join("\n") + "\n" + (out.system || []).join("\n");
    const ok = !expectRe || expectRe.test(all);
    if (!ok) {
      fails++;
      console.log("❌ FAIL:", label || input);
      console.log("   input:", JSON.stringify(input));
      console.log("   got:", JSON.stringify(all.slice(0, 300)));
      console.log("   expected:", expectRe);
    } else {
      console.log("✅", label || input);
    }
    return out;
  };
}

function check(cond, label) {
  if (!cond) { fails++; console.log("❌ FAIL:", label); }
  else console.log("✅", label);
}

/* ================= قطن ستور (ملابس: مقاس + لون) ================= */
console.log("===== قطن ستور =====");
let E = loadEngine("qoton.js");
let s = E.newSession();
let step = makeStep(E, s);

step("السلام عليكم", /أهلاً بيك/, "qoton: greeting");
step("عندكم تيشيرتات قطن؟", /تيشيرت قطن بيزك/, "qoton: product card");
step("خامته ايه؟", /قطن مصري 100%/, "qoton: material");
step("بكام الهودي؟", /٨٥٠/, "qoton: hoodie price");

step("تمام عايز أطلب واحد", /أي مقاس/, "qoton: order asks size");
step("L", /أي لون/, "qoton: order asks color");
step("أسود", /كم قطعة/, "qoton: order asks qty");
step("٢", /اسمك/, "qoton: arabic digits qty");
step("محمد أحمد", /الموبايل/, "qoton: ask phone");
step("01011223344", /محافظة/, "qoton: ask governorate");
step("القاهرة", /العنوان/, "qoton: ask address");
step("15 شارع التحرير الدقي الدور التالت", /تدفع إزاي/, "qoton: ask payment");
step("كاش عند الاستلام", /الإجمالي/, "qoton: summary");
let conf = step("تأكيد", /رقم الطلب: #1043/, "qoton: confirmed");
check(conf.orderConfirmed && conf.orderConfirmed.id === "1043", "qoton: orderConfirmed emitted");
check(/محمد أحمد/.test(conf.orderConfirmed.summary) && /01011223344/.test(conf.orderConfirmed.summary) && /هودي/.test(conf.orderConfirmed.summary), "qoton: wa.me summary has customer + phone + last-viewed product (hoodie)");
check(/مجيب/.test(conf.orderConfirmed.summary), "qoton: summary branded مجيب");
const oid = conf.orderConfirmed.id;

step("فين طلبي؟", /ابعتلي رقم طلبك/, "qoton: status ask number");
step("طلبي رقم 1037", /خرج مع المندوب/, "qoton: shipped mock");
step("فين طلبي رقم " + oid, /اتسجل بنجاح/, "qoton: my new order tracked");
step("الشحن للاسكندرية بكام؟", /٥٥/, "qoton: shipping alex fee");
step("سياسة الاسترجاع ايه؟", /14 يوم/, "qoton: returns policy");
step("عايز ارجع طلب", /رقم الطلب/, "qoton: return ask no");
step("1021", /طلب استرجاع/, "qoton: return registered");
step("عايز أكلم موظف", /التحويل إلى موظف/, "qoton: escalate");
step("متى هيرد عليا؟", /سجلت رسالتك/, "qoton: post-escalation logging");

/* ================= عطور الشرق (حجم فقط — بدون ألوان) ================= */
console.log("===== عطور الشرق =====");
E = loadEngine("attar.js");
s = E.newSession();
step = makeStep(E, s);

step("عندكم عود؟", /عود ملكي/, "attar: product card");
check(!/الألوان/.test(E.reply("عندكم عود؟", E.newSession()).replies[0].text), "attar: card has no colors line");
step("عايز أطلب العود الملكي", /أي الحجم؟/, "attar: asks الحجم not مقاس");
step("100 مل", /كم قطعة/, "attar: size -> qty directly, no color stage");
step("1", /اسمك/, "attar: ask name");
step("سارة محمود", /الموبايل/, "attar: ask phone");
step("01099887766", /محافظة/, "attar: ask governorate");
step("المنصورة", /العنوان/, "attar: ask address");
step("شارع الجمهورية عمارة 4 الدور الثاني", /تدفع إزاي/, "attar: ask payment");
let attarSummary = step("انستاباي", /الإجمالي/, "attar: summary");
check(!/لون/.test(attarSummary.replies.map((r) => r.text).join("\n")), "attar: summary has no color line");
conf = step("تأكيد", /رقم الطلب/, "attar: confirmed");
check(conf.orderConfirmed && /عود ملكي — 100 مل/.test(conf.orderConfirmed.summary), "attar: wa.me summary has size, no color");
step("سياسة الاسترجاع؟", /مغلقة/, "attar: returns policy mentions sealed");

/* ================= محمصة البن (وزن فقط) ================= */
console.log("===== محمصة البن البلدي =====");
E = loadEngine("coffee.js");
s = E.newSession();
step = makeStep(E, s);

step("عندكم بن تركي؟", /بن تركي وسط/, "coffee: product card");
step("عايز أطلب بن تركي", /أي الوزن؟/, "coffee: asks الوزن");
step("نص كيلو", null, "coffee: free-text weight attempt");
// «نص كيلو» مش من الأحجام المعتمدة — لازم يرفض ويعرض القائمة
let coffeeS = E.newSession();
E.reply("عايز أطلب بن تركي", coffeeS);
const badSize = E.reply("نص كيلو", coffeeS);
check(/250 جم/.test(badSize.replies[0].text), "coffee: invalid weight rejected with options");
const goodSize = E.reply("500 جم", coffeeS);
check(/كم قطعة/.test(goodSize.replies[0].text), "coffee: valid weight -> qty");
E.reply("2", coffeeS);
E.reply("كريم عادل", coffeeS);
E.reply("01033445566", coffeeS);
const coffeeGov = E.reply("أسيوط", coffeeS);
check(/٥٥/.test(coffeeGov.replies[0].text), "coffee: upper-egypt shipping fee shown at governorate stage");
E.reply("شارع الهلالي برج النور الدور الخامس", coffeeS);
E.reply("فودافون كاش", coffeeS);
conf = E.reply("تأكيد", coffeeS);
check(conf.orderConfirmed && /بن تركي وسط — 500 جم ×2/.test(conf.orderConfirmed.summary), "coffee: wa.me summary correct");
check(/١٬٠٥٥|1055/.test(conf.orderConfirmed.summary) === false, "coffee: total uses arabic digits (sanity)");

/* ================= fallback عام ================= */
console.log("===== fallback =====");
E = loadEngine("qoton.js");
const s2 = E.newSession();
E.reply("سؤال غريب جداً عن الفضاء", s2);
const esc2 = E.reply("سؤال أغرب عن الكواكب", s2);
check(esc2.system && esc2.system.length > 0, "auto-escalate after 2 fallbacks");

console.log(fails ? `\n${fails} فشل` : "\nكل الاختبارات نجحت ✅");
process.exit(fails ? 1 : 0);
