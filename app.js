(function () {
  "use strict";

  const STORAGE_KEY = "echo-english-v1";
  const SESSION_STORAGE_KEY = "echo-english-active-session-v1";
  const PHONETIC_CACHE_KEY = "echo-english-phonetics-v1";
  const DICTIONARY_ENDPOINT = "https://api.dictionaryapi.dev/api/v2/entries/en/";
  const MAX_ATTEMPTS = 3;
  const CONTRACTION_RULES = [
    [/\bwon't\b/g, "will not"], [/\bcan't\b/g, "can not"], [/\bcannot\b/g, "can not"],
    [/\bdon't\b/g, "do not"], [/\bdoesn't\b/g, "does not"], [/\bdidn't\b/g, "did not"],
    [/\bisn't\b/g, "is not"], [/\baren't\b/g, "are not"], [/\bwasn't\b/g, "was not"], [/\bweren't\b/g, "were not"],
    [/\bhaven't\b/g, "have not"], [/\bhasn't\b/g, "has not"], [/\bhadn't\b/g, "had not"],
    [/\bcouldn't\b/g, "could not"], [/\bwouldn't\b/g, "would not"], [/\bshouldn't\b/g, "should not"],
    [/\bi'm\b/g, "i am"], [/\byou're\b/g, "you are"], [/\bwe're\b/g, "we are"], [/\bthey're\b/g, "they are"],
    [/\bi've\b/g, "i have"], [/\byou've\b/g, "you have"], [/\bwe've\b/g, "we have"], [/\bthey've\b/g, "they have"],
    [/\bi'll\b/g, "i will"], [/\byou'll\b/g, "you will"], [/\bwe'll\b/g, "we will"], [/\bthey'll\b/g, "they will"],
    [/\bi'd\b/g, "i would"], [/\byou'd\b/g, "you would"], [/\bwe'd\b/g, "we would"], [/\bthey'd\b/g, "they would"],
    [/\bwhat's\b/g, "what is"], [/\bwhere's\b/g, "where is"], [/\bhow's\b/g, "how is"],
    [/\bwho's\b/g, "who is"], [/\bwhen's\b/g, "when is"], [/\bwhy's\b/g, "why is"],
    [/\bthat's\b/g, "that is"], [/\bthere's\b/g, "there is"], [/\bhere's\b/g, "here is"],
    [/\bit's\b/g, "it is"], [/\bhe's\b/g, "he is"], [/\bshe's\b/g, "she is"], [/\blet's\b/g, "let us"],
    [/\bwhats\b/g, "what is"], [/\bwheres\b/g, "where is"], [/\bhows\b/g, "how is"],
    [/\bim\b/g, "i am"], [/\bive\b/g, "i have"], [/\byoure\b/g, "you are"], [/\bweve\b/g, "we have"],
    [/\bdont\b/g, "do not"], [/\bdoesnt\b/g, "does not"], [/\bdidnt\b/g, "did not"],
    [/\bisnt\b/g, "is not"], [/\barent\b/g, "are not"], [/\bwasnt\b/g, "was not"], [/\bwerent\b/g, "were not"],
    [/\bhavent\b/g, "have not"], [/\bhasnt\b/g, "has not"], [/\bhadnt\b/g, "had not"],
    [/\bcouldnt\b/g, "could not"], [/\bwouldnt\b/g, "would not"], [/\bshouldnt\b/g, "should not"],
    [/\bwanna\b/g, "want to"], [/\bgonna\b/g, "going to"]
  ];
  const SEMANTIC_PHRASE_GROUPS = [
    ["what should i call you", "what can i call you", "what is your name", "how should i address you", "may i know your name"],
    ["could you", "can you", "would you please", "would you"],
    ["do you want to", "would you like to"],
    ["around here", "near here", "nearby"],
    ["take a photo", "take a picture", "snap a photo", "snap a picture"],
    ["look forward to your reply", "look forward to hearing from you"],
    ["nice talking to you", "nice chatting with you"],
    ["see you around", "see you later", "catch you later"],
    ["no worries", "no problem", "do not worry", "it is okay"]
  ];
  const SEMANTIC_WORD_EQUIVALENTS = {
    favourite: "favorite",
    picture: "photo",
    pictures: "photos",
    quote: "quotation",
    needs: "requirements",
    need: "requirement",
    catalog: "catalogue",
    insta: "instagram"
  };
  const BUILT_IN_ANSWER_VARIANTS = {
    "q-1": { anchor: "Please find the quotation attached", variants: ["Please see the attached quotation", "Please check the attached quotation", "I have attached the quotation"] },
    "q-2": { anchor: "I look forward to your reply", variants: ["I look forward to hearing from you", "I am looking forward to your reply", "Looking forward to hearing from you", "I hope to hear from you soon"] },
    "q-3": { anchor: "What is your target price", variants: ["What price are you targeting", "What price do you have in mind"] },
    "q-4": { anchor: "We can customize it according to your requirements", variants: ["We can customize it to your needs", "We can tailor it to your requirements", "We can tailor it to your needs"] },
    "q-travel-1": { anchor: "OMG, this place is amazing", variants: ["Wow, this place is amazing", "Wow, this place is beautiful", "This place is so beautiful", "Oh wow, this place is incredible"] },
    "q-travel-2": { anchor: "Hey, what's up", variants: ["Hi, how are you doing", "Hey, how are you doing", "Hey, how are things", "Hey, how have you been"] },
    "q-travel-3": { anchor: "I'm Yang. What should I call you", variants: ["My name is Yang. What's your name", "My name is Yang. What can I call you", "I'm Yang. How should I address you"] },
    "q-travel-4": { anchor: "Where are you from", variants: ["Where do you come from"] },
    "q-travel-5": { anchor: "Is this your first time here", variants: ["Is this your first time coming here", "Is it your first time here"] },
    "q-travel-6": { anchor: "I'm just here for a few days", variants: ["I'm only here for a few days", "I'm here for just a few days", "I'm just visiting for a few days"] },
    "q-travel-7": { anchor: "The weather is so nice today", variants: ["The weather is really nice today", "It's such a nice day today", "It's beautiful out today"] },
    "q-travel-8": { anchor: "This beach is gorgeous", variants: ["This beach is beautiful", "This beach is stunning", "What a beautiful beach"] },
    "q-travel-9": { anchor: "Could you take a quick photo for me", variants: ["Could you take a picture of me", "Would you mind taking a photo for me", "Can you snap a quick picture for me"] },
    "q-travel-10": { anchor: "Want me to take one for you", variants: ["Can I take a photo for you", "Would you like me to take a photo for you", "Want me to take your picture"] },
    "q-travel-11": { anchor: "Do you know any good food around here", variants: ["Is there any good food nearby", "Any good places to eat around here", "Do you know anywhere good to eat nearby"] },
    "q-travel-12": { anchor: "What's your favorite local dish", variants: ["Which local dish do you like best", "What's your favorite local food", "Which local food is your favorite"] },
    "q-travel-13": { anchor: "Is this spicy", variants: ["Is this dish spicy", "Is the food spicy"] },
    "q-travel-14": { anchor: "How do I get to the beach", variants: ["How can I get to the beach", "Which way is the beach", "Can you tell me how to get to the beach"] },
    "q-travel-15": { anchor: "Is it far? Can I walk there", variants: ["Is it far? Can I get there on foot", "Is it far? Is it within walking distance", "It's far? Can I walk there", "It is far? Can I walk there"] },
    "q-travel-16": { anchor: "Do I turn left here", variants: ["Should I take a left here", "Do I make a left here"] },
    "q-travel-17": { anchor: "Which beach is less crowded", variants: ["Which beach is quieter", "Which beach has fewer people", "Is there a less crowded beach"] },
    "q-travel-18": { anchor: "Where's a good spot for sunset", variants: ["What's a good place to watch the sunset", "Where's the best place to see the sunset", "Where can I watch the sunset"] },
    "q-travel-19": { anchor: "The waves are pretty strong today", variants: ["The waves are a bit rough today", "The waves are pretty big today", "The sea is rough today"] },
    "q-travel-20": { anchor: "Wanna grab a coffee", variants: ["Do you want to get some coffee", "How about grabbing a coffee", "Want to go for coffee"] },
    "q-travel-21": { anchor: "Are you on Instagram", variants: ["Do you use Instagram", "Do you have Instagram", "Are you on Insta"] },
    "q-travel-22": { anchor: "No worries, take your time", variants: ["No problem, take your time", "Don't worry, take your time", "It's okay, take your time"] },
    "q-travel-23": { anchor: "It was really nice talking to you", variants: ["It was nice chatting with you", "I enjoyed talking to you", "I had a great time talking with you"] },
    "q-travel-24": { anchor: "Have fun on your trip. See you around", variants: ["Enjoy your trip. See you later", "Have a good trip. Catch you later", "Have a great trip. See you"] }
  };
  const VOICE_NAME_HINTS = {
    male: ["david", "mark", "guy", "ryan", "george", "james", "christopher", "brian", "eric", "roger", "andrew", "liam", "william"],
    female: ["zira", "aria", "jenny", "samantha", "hazel", "susan", "emma", "michelle", "libby", "sonia", "natasha", "ava"]
  };
  const NATURAL_VOICE_HINTS = ["natural", "neural", "online", "premium", "enhanced", "studio"];
  const GRAMMAR_WORDS = {
    pronouns: new Set(["i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "this", "that", "these", "those", "who", "which", "what"]),
    articles: new Set(["a", "an", "the"]),
    modals: new Set(["can", "could", "may", "might", "must", "shall", "should", "will", "would"]),
    auxiliaries: new Set(["am", "is", "are", "was", "were", "be", "been", "being", "do", "does", "did", "have", "has", "had"]),
    questionWords: new Set(["what", "which", "who", "whom", "whose", "where", "when", "why", "how"]),
    conjunctions: new Set(["and", "but", "or", "so", "because", "if", "when", "while", "although", "though", "unless", "that", "whether"]),
    prepositions: new Set(["to", "for", "from", "with", "without", "of", "in", "on", "at", "by", "about", "into", "through", "during", "before", "after", "under", "over", "between", "within"]),
    commonVerbs: new Set(["need", "want", "test", "measure", "provide", "confirm", "use", "work", "run", "send", "quote", "customize", "customized", "support", "check", "connect", "handle", "simulate", "walk", "turn", "take", "get", "go", "make", "find", "let", "please"]),
    commonAdjectives: new Set(["available", "suitable", "customized", "reliable", "stable", "single", "three-phase", "high", "low", "rated", "required", "far", "close", "crowded", "strong"])
  };
  const BUILT_IN_PHONETICS = {
    reliable: { us: "/rɪˈlaɪəbəl/", uk: "/rɪˈlaɪəbəl/" },
    negotiate: { us: "/nɪˈɡoʊʃieɪt/", uk: "/nɪˈɡəʊʃieɪt/" },
    shipment: { us: "/ˈʃɪpmənt/", uk: "/ˈʃɪpmənt/" },
    quotation: { us: "/kwoʊˈteɪʃən/", uk: "/kwəʊˈteɪʃən/" },
    attached: { us: "/əˈtætʃt/", uk: "/əˈtætʃt/" },
    reply: { us: "/rɪˈplaɪ/", uk: "/rɪˈplaɪ/" },
    target: { us: "/ˈtɑːrɡɪt/", uk: "/ˈtɑːɡɪt/" },
    price: { us: "/praɪs/", uk: "/praɪs/" },
    customize: { us: "/ˈkʌstəmaɪz/", uk: "/ˈkʌstəmaɪz/" },
    according: { us: "/əˈkɔːrdɪŋ/", uk: "/əˈkɔːdɪŋ/" },
    requirements: { us: "/rɪˈkwaɪərmənts/", uk: "/rɪˈkwaɪəmənts/" },
    customer: { us: "/ˈkʌstəmər/", uk: "/ˈkʌstəmə/" },
    catalogue: { us: "/ˈkætəlɔːɡ/", uk: "/ˈkætəlɒɡ/" },
    establish: { us: "/ɪˈstæblɪʃ/", uk: "/ɪˈstæblɪʃ/" },
    contact: { us: "/ˈkɑːntækt/", uk: "/ˈkɒntækt/" },
    forward: { us: "/ˈfɔːrwərd/", uk: "/ˈfɔːwəd/" },
    please: { us: "/pliːz/", uk: "/pliːz/" },
    find: { us: "/faɪnd/", uk: "/faɪnd/" },
    answer: { us: "/ˈænsər/", uk: "/ˈɑːnsə/" },
    practice: { us: "/ˈpræktɪs/", uk: "/ˈpræktɪs/" },
    email: { us: "/ˈiːmeɪl/", uk: "/ˈiːmeɪl/" },
    invoice: { us: "/ˈɪnvɔɪs/", uk: "/ˈɪnvɔɪs/" },
    payment: { us: "/ˈpeɪmənt/", uk: "/ˈpeɪmənt/" },
    delivery: { us: "/dɪˈlɪvəri/", uk: "/dɪˈlɪvəri/" },
    quality: { us: "/ˈkwɑːləti/", uk: "/ˈkwɒləti/" },
    sample: { us: "/ˈsæmpəl/", uk: "/ˈsɑːmpəl/" },
    quantity: { us: "/ˈkwɑːntəti/", uk: "/ˈkwɒntəti/" },
    discount: { us: "/ˈdɪskaʊnt/", uk: "/ˈdɪskaʊnt/" },
    meet: { us: "/miːt/", uk: "/miːt/" },
    first: { us: "/fɜːrst/", uk: "/fɜːst/" },
    travel: { us: "/ˈtrævəl/", uk: "/ˈtrævəl/" },
    photo: { us: "/ˈfoʊtoʊ/", uk: "/ˈfəʊtəʊ/" },
    beach: { us: "/biːtʃ/", uk: "/biːtʃ/" },
    pier: { us: "/pɪr/", uk: "/pɪə/" },
    left: { us: "/left/", uk: "/left/" },
    attraction: { us: "/əˈtrækʃən/", uk: "/əˈtrækʃən/" },
    sunset: { us: "/ˈsʌnset/", uk: "/ˈsʌnset/" },
    quiet: { us: "/ˈkwaɪət/", uk: "/ˈkwaɪət/" },
    waves: { us: "/weɪvz/", uk: "/weɪvz/" },
    recommend: { us: "/ˌrekəˈmend/", uk: "/ˌrekəˈmend/" },
    local: { us: "/ˈloʊkəl/", uk: "/ˈləʊkəl/" },
    cash: { us: "/kæʃ/", uk: "/kæʃ/" },
    trip: { us: "/trɪp/", uk: "/trɪp/" }
  };

  const WORD_CLUES = {
    a: { meaning: "一个（不定冠词）", phonetic: "/ə/" },
    according: { meaning: "按照；根据", phonetic: "/əˈkɔːrdɪŋ/" },
    amazing: { meaning: "太棒了；惊艳的", phonetic: "/əˈmeɪzɪŋ/" },
    and: { meaning: "和；并且", phonetic: "/ænd/" },
    any: { meaning: "任何；一些", phonetic: "/ˈeni/" },
    are: { meaning: "是（用于 you/we/they）", phonetic: "/ɑːr/" },
    around: { meaning: "附近；周围", phonetic: "/əˈraʊnd/" },
    attached: { meaning: "附上的", phonetic: "/əˈtætʃt/" },
    beach: { meaning: "海滩", phonetic: "/biːtʃ/" },
    call: { meaning: "称呼；叫", phonetic: "/kɔːl/" },
    can: { meaning: "可以；能够", phonetic: "/kæn/" },
    coffee: { meaning: "咖啡", phonetic: "/ˈkɔːfi/" },
    could: { meaning: "可以吗（更委婉）", phonetic: "/kʊd/" },
    crowded: { meaning: "拥挤的；人多的", phonetic: "/ˈkraʊdɪd/" },
    customize: { meaning: "定制", phonetic: "/ˈkʌstəmaɪz/" },
    days: { meaning: "天；几天", phonetic: "/deɪz/" },
    dish: { meaning: "菜肴", phonetic: "/dɪʃ/" },
    do: { meaning: "助动词；做", phonetic: "/duː/" },
    far: { meaning: "远的", phonetic: "/fɑːr/" },
    favorite: { meaning: "最喜欢的", phonetic: "/ˈfeɪvərɪt/" },
    few: { meaning: "几个；少量", phonetic: "/fjuː/" },
    find: { meaning: "找到；查收", phonetic: "/faɪnd/" },
    first: { meaning: "第一次的；第一", phonetic: "/fɜːrst/" },
    food: { meaning: "食物；吃的", phonetic: "/fuːd/" },
    for: { meaning: "为了；给", phonetic: "/fɔːr/" },
    forward: { meaning: "向前；期待", phonetic: "/ˈfɔːrwərd/" },
    from: { meaning: "来自；从", phonetic: "/frʌm/" },
    fun: { meaning: "开心；乐趣", phonetic: "/fʌn/" },
    get: { meaning: "到达；得到", phonetic: "/ɡet/" },
    god: { meaning: "上帝；天啊", phonetic: "/ɡɑːd/" },
    going: { meaning: "进行；过得", phonetic: "/ˈɡoʊɪŋ/" },
    good: { meaning: "好的；不错的", phonetic: "/ɡʊd/" },
    gorgeous: { meaning: "美极了；非常漂亮", phonetic: "/ˈɡɔːrdʒəs/" },
    grab: { meaning: "去喝/吃；顺手拿", phonetic: "/ɡræb/" },
    great: { meaning: "很棒的", phonetic: "/ɡreɪt/" },
    have: { meaning: "有；祝你", phonetic: "/hæv/" },
    hey: { meaning: "嘿；嗨", phonetic: "/heɪ/" },
    here: { meaning: "这里", phonetic: "/hɪr/" },
    how: { meaning: "怎样；如何", phonetic: "/haʊ/" },
    "how's": { meaning: "怎么样（how is）", phonetic: "/haʊz/" },
    i: { meaning: "我", phonetic: "/aɪ/" },
    "i'm": { meaning: "我是（I am）", phonetic: "/aɪm/" },
    instagram: { meaning: "Instagram 社交平台", phonetic: "/ˈɪnstəɡræm/" },
    is: { meaning: "是", phonetic: "/ɪz/" },
    it: { meaning: "它；这件事", phonetic: "/ɪt/" },
    just: { meaning: "只是；就", phonetic: "/dʒʌst/" },
    know: { meaning: "知道；了解", phonetic: "/noʊ/" },
    left: { meaning: "左边；向左", phonetic: "/left/" },
    less: { meaning: "更少的", phonetic: "/les/" },
    local: { meaning: "当地的", phonetic: "/ˈloʊkəl/" },
    look: { meaning: "期待；看", phonetic: "/lʊk/" },
    looking: { meaning: "期待着", phonetic: "/ˈlʊkɪŋ/" },
    me: { meaning: "我（宾格）", phonetic: "/miː/" },
    my: { meaning: "我的", phonetic: "/maɪ/" },
    name: { meaning: "名字", phonetic: "/neɪm/" },
    nice: { meaning: "不错的；愉快的", phonetic: "/naɪs/" },
    no: { meaning: "没有；不用", phonetic: "/noʊ/" },
    oh: { meaning: "哦；啊", phonetic: "/oʊ/" },
    omg: { meaning: "天啊（口语缩写）", phonetic: "/ˌoʊ em ˈdʒiː/" },
    on: { meaning: "在；使用着", phonetic: "/ɑːn/" },
    one: { meaning: "一个；一张", phonetic: "/wʌn/" },
    our: { meaning: "我们的", phonetic: "/aʊr/" },
    photo: { meaning: "照片", phonetic: "/ˈfoʊtoʊ/" },
    place: { meaning: "地方", phonetic: "/pleɪs/" },
    please: { meaning: "请", phonetic: "/pliːz/" },
    pretty: { meaning: "挺；相当", phonetic: "/ˈprɪti/" },
    price: { meaning: "价格", phonetic: "/praɪs/" },
    quick: { meaning: "快速的；顺手的", phonetic: "/kwɪk/" },
    quotation: { meaning: "报价单", phonetic: "/kwoʊˈteɪʃən/" },
    really: { meaning: "真的；很", phonetic: "/ˈriːəli/" },
    reply: { meaning: "回复", phonetic: "/rɪˈplaɪ/" },
    requirements: { meaning: "要求；需求", phonetic: "/rɪˈkwaɪərmənts/" },
    see: { meaning: "见到；回头见", phonetic: "/siː/" },
    should: { meaning: "应该", phonetic: "/ʃʊd/" },
    so: { meaning: "这么；非常", phonetic: "/soʊ/" },
    spicy: { meaning: "辣的", phonetic: "/ˈspaɪsi/" },
    spot: { meaning: "地点；位置", phonetic: "/spɑːt/" },
    strong: { meaning: "强的；大的", phonetic: "/strɔːŋ/" },
    sunset: { meaning: "日落", phonetic: "/ˈsʌnset/" },
    take: { meaning: "拍；带；花费", phonetic: "/teɪk/" },
    talking: { meaning: "聊天；交谈", phonetic: "/ˈtɔːkɪŋ/" },
    target: { meaning: "目标", phonetic: "/ˈtɑːrɡɪt/" },
    the: { meaning: "这/那；定冠词", phonetic: "/ðə/" },
    there: { meaning: "那里", phonetic: "/ðer/" },
    this: { meaning: "这个；这里", phonetic: "/ðɪs/" },
    time: { meaning: "时间；次数", phonetic: "/taɪm/" },
    to: { meaning: "到；去；向", phonetic: "/tə/" },
    today: { meaning: "今天", phonetic: "/təˈdeɪ/" },
    trip: { meaning: "旅行；旅途", phonetic: "/trɪp/" },
    turn: { meaning: "转弯", phonetic: "/tɜːrn/" },
    up: { meaning: "近况；向上", phonetic: "/ʌp/" },
    walk: { meaning: "步行；走路", phonetic: "/wɔːk/" },
    wanna: { meaning: "想要（want to 的口语）", phonetic: "/ˈwɑːnə/" },
    want: { meaning: "想要", phonetic: "/wɑːnt/" },
    was: { meaning: "是（过去式）", phonetic: "/wʌz/" },
    waves: { meaning: "海浪", phonetic: "/weɪvz/" },
    weather: { meaning: "天气", phonetic: "/ˈweðər/" },
    we: { meaning: "我们", phonetic: "/wiː/" },
    what: { meaning: "什么", phonetic: "/wʌt/" },
    "what's": { meaning: "是什么（what is）", phonetic: "/wʌts/" },
    where: { meaning: "哪里", phonetic: "/wer/" },
    "where's": { meaning: "在哪里（where is）", phonetic: "/werz/" },
    which: { meaning: "哪一个", phonetic: "/wɪtʃ/" },
    worries: { meaning: "担心；没关系", phonetic: "/ˈwɜːriz/" },
    yang: { meaning: "杨（名字）", phonetic: "/jɑːŋ/" },
    you: { meaning: "你；你们", phonetic: "/juː/" },
    your: { meaning: "你的；你们的", phonetic: "/jʊr/" }
  };

  const LOCAL_WORD_DETAILS = {
    ac: { meaning: "交流电", partOfSpeech: "缩写 / 名词" },
    actual: { meaning: "实际的；真实的", partOfSpeech: "形容词" },
    adjustment: { meaning: "调节；调整", partOfSpeech: "名词" },
    aging: { meaning: "老化；老化测试", partOfSpeech: "名词" },
    "alb-dr": { meaning: "ALB-DR 单相交流负载系列", partOfSpeech: "产品型号 / 名词" },
    "alb-sr": { meaning: "ALB-SR 三相交流负载系列", partOfSpeech: "产品型号 / 名词" },
    ambient: { meaning: "环境的；周围的", partOfSpeech: "形容词" },
    automatic: { meaning: "自动的", partOfSpeech: "形容词" },
    available: { meaning: "可提供的；可用的", partOfSpeech: "形容词" },
    bank: { meaning: "负载箱；负载组", partOfSpeech: "名词", phonetic: "/bæŋk/" },
    basic: { meaning: "基础的；基本的", partOfSpeech: "形容词", phonetic: "/ˈbeɪsɪk/" },
    battery: { meaning: "电池", partOfSpeech: "名词" },
    breaker: { meaning: "断路器", partOfSpeech: "名词" },
    capacitive: { meaning: "容性的", partOfSpeech: "形容词" },
    cc: { meaning: "恒流模式", partOfSpeech: "缩写 / 名词" },
    changing: { meaning: "变化的；不断改变的", partOfSpeech: "形容词 / 动词", phonetic: "/ˈtʃeɪndʒɪŋ/" },
    circuit: { meaning: "电路；回路", partOfSpeech: "名词" },
    communication: { meaning: "通信；通讯", partOfSpeech: "名词", phonetic: "/kəˌmjuːnɪˈkeɪʃən/" },
    condition: { meaning: "条件；工况", partOfSpeech: "名词" },
    confirm: { meaning: "确认", partOfSpeech: "动词" },
    continuous: { meaning: "连续的；持续的", partOfSpeech: "形容词" },
    control: { meaning: "控制；控制方式", partOfSpeech: "名词 / 动词", phonetic: "/kənˈtroʊl/" },
    cp: { meaning: "恒功率模式", partOfSpeech: "缩写 / 名词" },
    cr: { meaning: "恒电阻模式", partOfSpeech: "缩写 / 名词" },
    crik: { meaning: "CRIK 直流电子负载系列", partOfSpeech: "产品系列 / 名词" },
    current: { meaning: "电流", partOfSpeech: "名词", phonetic: "/ˈkɜːrənt/" },
    cv: { meaning: "恒电压模式", partOfSpeech: "缩写 / 名词" },
    cycle: { meaning: "循环；周期", partOfSpeech: "名词" },
    data: { meaning: "数据", partOfSpeech: "名词" },
    dc: { meaning: "直流电", partOfSpeech: "缩写 / 名词" },
    delivery: { meaning: "交货；交付", partOfSpeech: "名词" },
    "dlb-lr": { meaning: "DLB-LR 直流阻性负载系列", partOfSpeech: "产品型号 / 名词" },
    duty: { meaning: "工作；负载（常见于 duty cycle）", partOfSpeech: "名词" },
    energy: { meaning: "能量；电能", partOfSpeech: "名词" },
    engineering: { meaning: "工程设计；工程技术", partOfSpeech: "名词 / 形容词" },
    factor: { meaning: "因数；因素（如功率因数）", partOfSpeech: "名词" },
    final: { meaning: "最终的", partOfSpeech: "形容词" },
    generator: { meaning: "发电机", partOfSpeech: "名词" },
    grid: { meaning: "电网", partOfSpeech: "名词" },
    heat: { meaning: "热量；发热", partOfSpeech: "名词 / 动词" },
    "high-power": { meaning: "大功率的", partOfSpeech: "形容词" },
    inductive: { meaning: "感性的", partOfSpeech: "形容词" },
    input: { meaning: "输入；输入端", partOfSpeech: "名词" },
    interface: { meaning: "接口", partOfSpeech: "名词" },
    ipac: { meaning: "IPAC 交流回馈式电子负载系列", partOfSpeech: "产品系列 / 名词" },
    ipdc: { meaning: "IPDC 直流回馈式电子负载系列", partOfSpeech: "产品系列 / 名词" },
    "ip-rlc": { meaning: "IP-RLC 可编程交流负载系列", partOfSpeech: "产品系列 / 名词" },
    latest: { meaning: "最新的", partOfSpeech: "形容词" },
    load: { meaning: "负载；加载", partOfSpeech: "名词 / 动词", phonetic: "/loʊd/" },
    loading: { meaning: "带载；加载过程", partOfSpeech: "名词 / 动词", phonetic: "/ˈloʊdɪŋ/" },
    log: { meaning: "记录；日志", partOfSpeech: "名词 / 动词" },
    manual: { meaning: "手动的；说明书", partOfSpeech: "形容词 / 名词" },
    mixed: { meaning: "混合的", partOfSpeech: "形容词" },
    model: { meaning: "型号；机型", partOfSpeech: "名词" },
    mode: { meaning: "模式", partOfSpeech: "名词" },
    nonlinear: { meaning: "非线性的", partOfSpeech: "形容词" },
    operating: { meaning: "运行的；工作中的", partOfSpeech: "形容词" },
    operation: { meaning: "运行；操作", partOfSpeech: "名词" },
    option: { meaning: "选项；可选配置", partOfSpeech: "名词", phonetic: "/ˈɑːpʃən/" },
    parameter: { meaning: "参数", partOfSpeech: "名词" },
    peak: { meaning: "峰值；峰值的", partOfSpeech: "名词 / 形容词" },
    plan: { meaning: "计划；测试方案", partOfSpeech: "名词 / 动词" },
    plb: { meaning: "PLB 可编程交流负载系列", partOfSpeech: "产品系列 / 名词" },
    power: { meaning: "功率；电源", partOfSpeech: "名词", phonetic: "/ˈpaʊər/" },
    profile: { meaning: "测试曲线；测试步骤组合", partOfSpeech: "名词", phonetic: "/ˈproʊfaɪl/" },
    programmable: { meaning: "可编程的", partOfSpeech: "形容词", phonetic: "/ˈproʊɡræməbəl/" },
    rack: { meaning: "机架；机柜", partOfSpeech: "名词" },
    rectifier: { meaning: "整流器", partOfSpeech: "名词" },
    regenerative: { meaning: "回馈式的；再生式的", partOfSpeech: "形容词" },
    remote: { meaning: "远程的；远程控制", partOfSpeech: "形容词 / 名词" },
    report: { meaning: "报告；报表", partOfSpeech: "名词 / 动词" },
    response: { meaning: "响应；反应", partOfSpeech: "名词" },
    right: { meaning: "合适的；正确的", partOfSpeech: "形容词" },
    rlc: { meaning: "阻性、感性和容性组合", partOfSpeech: "缩写 / 名词" },
    sequence: { meaning: "顺序；测试序列", partOfSpeech: "名词" },
    series: { meaning: "系列", partOfSpeech: "名词" },
    server: { meaning: "服务器", partOfSpeech: "名词" },
    sheet: { meaning: "表格；规格表", partOfSpeech: "名词" },
    "single-phase": { meaning: "单相的", partOfSpeech: "形容词" },
    site: { meaning: "现场；使用地点", partOfSpeech: "名词" },
    stable: { meaning: "稳定的", partOfSpeech: "形容词" },
    standard: { meaning: "标准；标准的", partOfSpeech: "名词 / 形容词" },
    starting: { meaning: "启动；起动阶段", partOfSpeech: "名词 / 动词" },
    steady: { meaning: "稳定的；恒定的", partOfSpeech: "形容词", phonetic: "/ˈstedi/" },
    step: { meaning: "步骤；步进", partOfSpeech: "名词" },
    suitable: { meaning: "适合的", partOfSpeech: "形容词", phonetic: "/ˈsuːtəbəl/" },
    supply: { meaning: "电源；供电", partOfSpeech: "名词 / 动词" },
    technical: { meaning: "技术的", partOfSpeech: "形容词" },
    temperature: { meaning: "温度", partOfSpeech: "名词" },
    test: { meaning: "测试；检验", partOfSpeech: "名词 / 动词", phonetic: "/test/" },
    ups: { meaning: "不间断电源", partOfSpeech: "缩写 / 名词" },
    value: { meaning: "数值；参数值", partOfSpeech: "名词" },
    variable: { meaning: "变化的；可变的", partOfSpeech: "形容词" },
    voltage: { meaning: "电压", partOfSpeech: "名词", phonetic: "/ˈvoʊltɪdʒ/" },
    working: { meaning: "工作的；运行的", partOfSpeech: "形容词" }
  };

  const WORD_COACH_SUPPLEMENTS = {
    ac: { phonetic: "/ˌeɪ ˈsiː/" },
    accept: { meaning: "接受；承受", partOfSpeech: "动词", phonetic: "/əkˈsept/" },
    actual: { phonetic: "/ˈæktʃuəl/" },
    adjustment: { phonetic: "/əˈdʒʌstmənt/" },
    after: { meaning: "在……之后", partOfSpeech: "介词 / 连词", phonetic: "/ˈæftər/" },
    against: { meaning: "依据；与……对照", partOfSpeech: "介词", phonetic: "/əˈɡenst/" },
    aging: { phonetic: "/ˈeɪdʒɪŋ/" },
    "alb-dr": { phonetic: "/ˌeɪ el biː diː ˈɑːr/" },
    "alb-sr": { phonetic: "/ˌeɪ el biː es ˈɑːr/" },
    ambient: { phonetic: "/ˈæmbiənt/" },
    an: { meaning: "一个（用于元音音素前）", partOfSpeech: "冠词", phonetic: "/æn/" },
    as: { meaning: "例如；作为；像……一样", partOfSpeech: "介词 / 连词", phonetic: "/æz/" },
    at: { meaning: "在；以（某一数值或状态）", partOfSpeech: "介词", phonetic: "/æt/" },
    automatic: { phonetic: "/ˌɔːtəˈmætɪk/" },
    available: { phonetic: "/əˈveɪləbəl/" },
    back: { meaning: "返回；回到原处", partOfSpeech: "副词 / 名词", phonetic: "/bæk/" },
    base: { meaning: "以……为依据；基础", partOfSpeech: "动词 / 名词", phonetic: "/beɪs/" },
    based: { meaning: "基于；以……为依据", partOfSpeech: "形容词 / 动词", phonetic: "/beɪst/" },
    battery: { phonetic: "/ˈbætəri/" },
    be: { meaning: "是；处于某种状态", partOfSpeech: "助动词", phonetic: "/biː/" },
    before: { meaning: "在……之前", partOfSpeech: "介词 / 连词", phonetic: "/bɪˈfɔːr/" },
    better: { meaning: "更合适的；更好的", partOfSpeech: "形容词", phonetic: "/ˈbetər/" },
    breaker: { phonetic: "/ˈbreɪkər/" },
    capacitive: { phonetic: "/kəˈpæsətɪv/" },
    cc: { phonetic: "/ˌsiː ˈsiː/" },
    check: { meaning: "检查；确认", partOfSpeech: "动词 / 名词", phonetic: "/tʃek/" },
    checked: { meaning: "已检查；已核对", partOfSpeech: "动词 / 形容词", phonetic: "/tʃekt/" },
    circuit: { phonetic: "/ˈsɜːrkɪt/" },
    confirm: { phonetic: "/kənˈfɜːrm/" },
    condition: { phonetic: "/kənˈdɪʃən/" },
    continuous: { phonetic: "/kənˈtɪnjuəs/" },
    cp: { phonetic: "/ˌsiː ˈpiː/" },
    cr: { phonetic: "/ˌsiː ˈɑːr/" },
    crik: { phonetic: "/ˌsiː ɑːr aɪ ˈkeɪ/" },
    crik5000: { meaning: "CRIK5000 直流电子负载系列", partOfSpeech: "产品型号 / 名词", phonetic: "/ˌsiː ɑːr aɪ keɪ ˈfaɪv θaʊzənd/" },
    cv: { phonetic: "/ˌsiː ˈviː/" },
    cycle: { phonetic: "/ˈsaɪkəl/" },
    data: { phonetic: "/ˈdeɪtə/" },
    dc: { phonetic: "/ˌdiː ˈsiː/" },
    design: { meaning: "设计；按需求设计", partOfSpeech: "动词 / 名词", phonetic: "/dɪˈzaɪn/" },
    designed: { meaning: "专为……设计的", partOfSpeech: "形容词 / 动词", phonetic: "/dɪˈzaɪnd/" },
    "dlb-lr": { phonetic: "/ˌdiː el biː el ˈɑːr/" },
    duty: { phonetic: "/ˈduːti/" },
    energy: { phonetic: "/ˈenərdʒi/" },
    engineering: { phonetic: "/ˌendʒɪˈnɪrɪŋ/" },
    factor: { phonetic: "/ˈfæktər/" },
    final: { phonetic: "/ˈfaɪnəl/" },
    finalize: { meaning: "最终确定；定下来", partOfSpeech: "动词", phonetic: "/ˈfaɪnəlaɪz/" },
    follow: { meaning: "遵循；按照", partOfSpeech: "动词", phonetic: "/ˈfɑːloʊ/" },
    generator: { phonetic: "/ˈdʒenəreɪtər/" },
    grid: { phonetic: "/ɡrɪd/" },
    handle: { meaning: "处理；承受", partOfSpeech: "动词", phonetic: "/ˈhændəl/" },
    heat: { phonetic: "/hiːt/" },
    "high-power": { phonetic: "/ˌhaɪ ˈpaʊər/" },
    if: { meaning: "如果；是否", partOfSpeech: "连词", phonetic: "/ɪf/" },
    inductive: { phonetic: "/ɪnˈdʌktɪv/" },
    input: { phonetic: "/ˈɪnpʊt/" },
    "ip-rlc": { phonetic: "/ˌaɪ piː ɑːr el ˈsiː/" },
    ipac: { phonetic: "/ˌaɪ piː eɪ ˈsiː/" },
    ipac2000: { meaning: "IPAC2000 交流回馈式电子负载系列", partOfSpeech: "产品型号 / 名词", phonetic: "/ˌaɪ piː eɪ siː ˈtuː θaʊzənd/" },
    ipdc: { phonetic: "/ˌaɪ piː diː ˈsiː/" },
    ipdc2000: { meaning: "IPDC2000 直流回馈式电子负载系列", partOfSpeech: "产品型号 / 名词", phonetic: "/ˌaɪ piː diː siː ˈtuː θaʊzənd/" },
    latest: { phonetic: "/ˈleɪtɪst/" },
    let: { meaning: "让；允许", partOfSpeech: "动词", phonetic: "/let/" },
    long: { meaning: "长时间的；长的", partOfSpeech: "形容词", phonetic: "/lɔːŋ/" },
    manual: { phonetic: "/ˈmænjuəl/" },
    many: { meaning: "许多；多少", partOfSpeech: "限定词 / 代词", phonetic: "/ˈmeni/" },
    mixed: { phonetic: "/mɪkst/" },
    mode: { phonetic: "/moʊd/" },
    model: { phonetic: "/ˈmɑːdəl/" },
    must: { meaning: "必须；务必", partOfSpeech: "情态动词", phonetic: "/mʌst/" },
    need: { meaning: "需要", partOfSpeech: "动词 / 名词", phonetic: "/niːd/" },
    of: { meaning: "……的；属于", partOfSpeech: "介词", phonetic: "/əv/" },
    once: { meaning: "一旦；一次", partOfSpeech: "连词 / 副词", phonetic: "/wʌns/" },
    only: { meaning: "仅仅；只", partOfSpeech: "副词 / 形容词", phonetic: "/ˈoʊnli/" },
    operating: { phonetic: "/ˈɑːpəreɪtɪŋ/" },
    operation: { phonetic: "/ˌɑːpəˈreɪʃən/" },
    or: { meaning: "或者；还是", partOfSpeech: "连词", phonetic: "/ɔːr/" },
    peak: { phonetic: "/piːk/" },
    per: { meaning: "每；每一个", partOfSpeech: "介词", phonetic: "/pɜːr/" },
    plb: { phonetic: "/ˌpiː el ˈbiː/" },
    point: { meaning: "要点；位置；指出", partOfSpeech: "名词 / 动词", phonetic: "/pɔɪnt/" },
    prepare: { meaning: "准备；编制", partOfSpeech: "动词", phonetic: "/prɪˈper/" },
    proper: { meaning: "合适的；正确的", partOfSpeech: "形容词", phonetic: "/ˈprɑːpər/" },
    quantity: { meaning: "数量；订购数量", partOfSpeech: "名词" },
    rectifier: { phonetic: "/ˈrektəfaɪər/" },
    reduce: { meaning: "减少；降低", partOfSpeech: "动词", phonetic: "/rɪˈduːs/" },
    regenerative: { phonetic: "/rɪˈdʒenərətɪv/" },
    remote: { phonetic: "/rɪˈmoʊt/" },
    report: { phonetic: "/rɪˈpɔːrt/" },
    require: { meaning: "需要；要求", partOfSpeech: "动词", phonetic: "/rɪˈkwaɪər/" },
    required: { meaning: "所需的；必须的", partOfSpeech: "形容词 / 动词", phonetic: "/rɪˈkwaɪərd/" },
    response: { phonetic: "/rɪˈspɑːns/" },
    rlc: { phonetic: "/ˌɑːr el ˈsiː/" },
    run: { meaning: "运行；持续工作", partOfSpeech: "动词 / 名词", phonetic: "/rʌn/" },
    send: { meaning: "发送；提供给", partOfSpeech: "动词", phonetic: "/send/" },
    sequence: { phonetic: "/ˈsiːkwəns/" },
    series: { phonetic: "/ˈsɪriːz/" },
    server: { phonetic: "/ˈsɜːrvər/" },
    "single-phase": { phonetic: "/ˌsɪŋɡəl ˈfeɪz/" },
    site: { phonetic: "/saɪt/" },
    stable: { phonetic: "/ˈsteɪbəl/" },
    standard: { phonetic: "/ˈstændərd/" },
    starting: { phonetic: "/ˈstɑːrtɪŋ/" },
    step: { phonetic: "/step/" },
    such: { meaning: "例如这样的；此类", partOfSpeech: "限定词 / 代词", phonetic: "/sʌtʃ/" },
    supply: { phonetic: "/səˈplaɪ/" },
    technical: { phonetic: "/ˈteknɪkəl/" },
    temperature: { phonetic: "/ˈtemprətʃər/" },
    these: { meaning: "这些", partOfSpeech: "代词 / 限定词", phonetic: "/ðiːz/" },
    under: { meaning: "在……条件下；低于", partOfSpeech: "介词", phonetic: "/ˈʌndər/" },
    ups: { phonetic: "/ˌjuː piː ˈes/" },
    us: { meaning: "我们（宾格）", partOfSpeech: "代词", phonetic: "/ʌs/" },
    used: { meaning: "用于；被使用", partOfSpeech: "动词 / 形容词", phonetic: "/juːzd/" },
    value: { phonetic: "/ˈvæljuː/" },
    well: { meaning: "也；很好地", partOfSpeech: "副词", phonetic: "/wel/" },
    will: { meaning: "将；会", partOfSpeech: "情态动词", phonetic: "/wɪl/" },
    with: { meaning: "带有；使用；和……一起", partOfSpeech: "介词", phonetic: "/wɪð/" }
  };

  const CORE_HINTS = {
    "q-1": { word: "quotation", meaning: "报价单", phonetic: "/kwoʊˈteɪʃən/" },
    "q-2": { word: "reply", meaning: "回复", phonetic: "/rɪˈplaɪ/" },
    "q-3": { word: "target", meaning: "目标", phonetic: "/ˈtɑːrɡɪt/" },
    "q-4": { word: "customize", meaning: "定制", phonetic: "/ˈkʌstəmaɪz/" },
    "q-5": { word: "reliable", meaning: "可靠的", phonetic: "/rɪˈlaɪəbəl/" },
    "q-6": { word: "negotiate", meaning: "谈判；协商", phonetic: "/nɪˈɡoʊʃieɪt/" },
    "q-7": { word: "shipment", meaning: "货物；装运", phonetic: "/ˈʃɪpmənt/" }
  };

  const TRAVEL_SET = {
    id: "set-travel",
    name: "旅行日常闲聊",
    description: "像路上真实聊天一样，短一点、自然一点、马上能用",
    createdAt: 3,
    questions: [
      { id: "q-travel-1", prompt: "OMG，这里也太美了吧！", answers: ["OMG, this place is amazing", "Oh my God, this place is amazing"], note: "看到好风景时脱口而出" },
      { id: "q-travel-2", prompt: "嗨，最近怎么样？", answers: ["Hey, what's up", "Hey, how's it going"], note: "很随意的打招呼" },
      { id: "q-travel-3", prompt: "我叫杨，你怎么称呼？", answers: ["I'm Yang. What should I call you", "I'm Yang. What's your name"], note: "认识新朋友" },
      { id: "q-travel-4", prompt: "你从哪里来？", answers: ["Where are you from"], note: "旅行聊天高频句" },
      { id: "q-travel-5", prompt: "这是你第一次来这儿吗？", answers: ["Is this your first time here"], note: "接着聊旅行经历" },
      { id: "q-travel-6", prompt: "我就来玩几天。", answers: ["I'm just here for a few days"], note: "简单说明行程" },
      { id: "q-travel-7", prompt: "今天天气也太好了。", answers: ["The weather is so nice today"], note: "最自然的开场话题" },
      { id: "q-travel-8", prompt: "这个海滩太绝了。", answers: ["This beach is gorgeous", "This beach is amazing"], note: "gorgeous 就是美极了" },
      { id: "q-travel-9", prompt: "能顺手帮我拍张照吗？", answers: ["Could you take a quick photo for me", "Can you take a quick photo for me"], note: "quick 让语气更像随口请求" },
      { id: "q-travel-10", prompt: "要不要我也帮你拍一张？", answers: ["Want me to take one for you", "Do you want me to take one for you"], note: "帮别人拍照时很实用" },
      { id: "q-travel-11", prompt: "附近有啥好吃的吗？", answers: ["Do you know any good food around here", "Any good food around here"], note: "不必每次都说完整长句" },
      { id: "q-travel-12", prompt: "你最喜欢哪道当地菜？", answers: ["What's your favorite local dish"], note: "聊当地美食" },
      { id: "q-travel-13", prompt: "这个辣吗？", answers: ["Is this spicy", "Is it spicy"], note: "点餐前确认辣度" },
      { id: "q-travel-14", prompt: "去海滩怎么走？", answers: ["How do I get to the beach"], note: "直接自然的问路方式" },
      { id: "q-travel-15", prompt: "远吗？走路能到吗？", answers: ["Is it far? Can I walk there"], note: "Is it far? 是标准问法；It's far? 是带确认语气的口语问法" },
      { id: "q-travel-16", prompt: "我是在这里左转吗？", answers: ["Do I turn left here", "Should I turn left here"], note: "确认方向" },
      { id: "q-travel-17", prompt: "哪个海滩人少一点？", answers: ["Which beach is less crowded"], note: "找清静一点的地方" },
      { id: "q-travel-18", prompt: "哪里看日落比较好？", answers: ["Where's a good spot for sunset", "Where is a good spot for sunset"], note: "spot 是很口语的地点说法" },
      { id: "q-travel-19", prompt: "今天浪有点大。", answers: ["The waves are pretty strong today"], note: "pretty 在这里表示挺、相当" },
      { id: "q-travel-20", prompt: "要不要去喝杯咖啡？", answers: ["Wanna grab a coffee", "Do you want to grab a coffee"], note: "wanna 和 grab 都很口语" },
      { id: "q-travel-21", prompt: "你玩 Instagram 吗？", answers: ["Are you on Instagram"], note: "旅途中交换联系方式" },
      { id: "q-travel-22", prompt: "没事，慢慢来。", answers: ["No worries, take your time"], note: "比 No problem 更松弛" },
      { id: "q-travel-23", prompt: "跟你聊天挺开心的。", answers: ["It was really nice talking to you", "Nice talking to you"], note: "结束聊天前很自然" },
      { id: "q-travel-24", prompt: "旅途愉快，回头见。", answers: ["Have fun on your trip. See you around", "Have a great trip. See you around"], note: "轻松道别" }
    ]
  };

  const LOAD_SALES_SET = {
    id: "set-load-sales",
    name: "负载产品外贸实战",
    description: "从客户说 I need a load 到确认参数、推荐系列和报价前收口",
    createdAt: 4,
    questions: [
      {
        id: "q-load-1",
        prompt: "客户只说：I need a load. 你先问什么？",
        answers: ["What equipment are you going to test", "What kind of equipment are you going to test"],
        note: "先问被测对象，不要一上来只问电压和电流。",
        hint: { word: "equipment", meaning: "设备；这里指被测设备", phonetic: "/ɪˈkwɪpmənt/" }
      },
      {
        id: "q-load-2",
        prompt: "被测设备的输出是交流还是直流？",
        answers: ["Is the output AC or DC", "Is your output AC or DC"],
        note: "这是判断产品大类的第一道分叉。",
        hint: { word: "output", meaning: "输出", phonetic: "/ˈaʊtpʊt/" }
      },
      {
        id: "q-load-3",
        prompt: "如果是交流，是单相还是三相？",
        answers: ["Is it single-phase or three-phase", "Is the output single-phase or three-phase"],
        note: "同时还要继续确认频率。",
        hint: { word: "three-phase", meaning: "三相的", phonetic: "/ˌθriː ˈfeɪz/" }
      },
      {
        id: "q-load-4",
        prompt: "工作频率是多少？",
        answers: ["What is the operating frequency", "What is the working frequency"],
        note: "不要默认所有交流设备都是 50 Hz。",
        hint: { word: "frequency", meaning: "频率", phonetic: "/ˈfriːkwənsi/" }
      },
      {
        id: "q-load-5",
        prompt: "最大电压、电流和功率分别是多少？",
        answers: ["What are the maximum voltage, current, and power", "What are your maximum voltage, current, and power requirements"],
        note: "询盘里最核心的三个数值，缺一个都不能稳妥选型。",
        hint: { word: "maximum", meaning: "最大的；上限值", phonetic: "/ˈmæksɪməm/" }
      },
      {
        id: "q-load-6",
        prompt: "这些数值是额定值还是峰值？",
        answers: ["Are these rated values or peak values", "Are those rated values or peak values"],
        note: "额定值和瞬时峰值不能混在一起选型。",
        hint: { word: "rated", meaning: "额定的", phonetic: "/ˈreɪtɪd/" }
      },
      {
        id: "q-load-7",
        prompt: "您只需要纯阻性负载吗？",
        answers: ["Do you need a resistive load only", "Do you only need a resistive load"],
        note: "基础带载可以先问这一句。",
        hint: { word: "resistive", meaning: "阻性的", phonetic: "/rɪˈzɪstɪv/" }
      },
      {
        id: "q-load-8",
        prompt: "是否需要模拟感性、容性或混合负载？",
        answers: ["Do you need to simulate an inductive, capacitive, or mixed load", "Do you need an inductive, capacitive, or mixed load"],
        note: "出现 R、L、C 或混合负载时，要考虑复杂交流负载方案。",
        hint: { word: "simulate", meaning: "模拟", phonetic: "/ˈsɪmjəleɪt/" }
      },
      {
        id: "q-load-9",
        prompt: "需要可调功率因数吗？",
        answers: ["Do you need an adjustable power factor", "Does the power factor need to be adjustable"],
        note: "功率因数需求会影响交流负载方案。",
        hint: { word: "adjustable", meaning: "可调的", phonetic: "/əˈdʒʌstəbl/" }
      },
      {
        id: "q-load-10",
        prompt: "这是稳定带载、老化测试还是动态测试？",
        answers: ["Is this for a steady load, an aging test, or a dynamic test", "Is this a steady load, aging, or dynamic test"],
        note: "先分清稳定耗能还是快速变化测试。",
        hint: { word: "dynamic", meaning: "动态的；快速变化的", phonetic: "/daɪˈnæmɪk/" }
      },
      {
        id: "q-load-11",
        prompt: "负载需要连续运行多长时间？",
        answers: ["How long will the load run continuously", "How long do you need the load to run continuously"],
        note: "连续时间会影响散热、工作制和方案余量。",
        hint: { word: "continuously", meaning: "连续地", phonetic: "/kənˈtɪnjuəsli/" }
      },
      {
        id: "q-load-12",
        prompt: "这项测试的工作循环是什么？",
        answers: ["What is the duty cycle for the test", "What duty cycle do you require for the test"],
        note: "工作循环要说清加载多久、停多久、重复多少次。",
        hint: { word: "duty cycle", meaning: "工作循环；负载周期", phonetic: "/ˈdjuːti ˌsaɪkl/" }
      },
      {
        id: "q-load-13",
        prompt: "您需要多大的负载步进和调整精度？",
        answers: ["What load step and adjustment accuracy do you need", "What load step and accuracy do you require"],
        note: "有精细调节要求时，不能只看总功率。",
        hint: { word: "accuracy", meaning: "精度", phonetic: "/ˈækjərəsi/" }
      },
      {
        id: "q-load-14",
        prompt: "需要手动控制还是可编程远程控制？",
        answers: ["Do you need manual control or programmable remote control", "Do you require manual or programmable remote control"],
        note: "控制方式会影响配置和通讯接口。",
        hint: { word: "programmable", meaning: "可编程的", phonetic: "/ˈprəʊɡræməbl/" }
      },
      {
        id: "q-load-15",
        prompt: "您需要哪些通讯接口？",
        answers: ["Which communication interfaces do you require", "What communication interfaces do you need"],
        note: "常见接口包括 RS232、RS485、CAN、LAN 和 GPIB。",
        hint: { word: "interface", meaning: "接口", phonetic: "/ˈɪntəfeɪs/" }
      },
      {
        id: "q-load-16",
        prompt: "您需要记录测试数据或自动生成报告吗？",
        answers: ["Do you need test data logging or an automatic test report", "Do you need to log test data or generate an automatic test report"],
        note: "数据记录和报表通常与自动化控制一起确认。",
        hint: { word: "logging", meaning: "记录；数据留存", phonetic: "/ˈlɒɡɪŋ/" }
      },
      {
        id: "q-load-17",
        prompt: "负载将安装并使用在哪里？",
        answers: ["Where will the load be installed and used", "Where do you plan to install and use the load"],
        note: "实验室、工厂、户外和现场验收的条件不同。",
        hint: { word: "installed", meaning: "安装的", phonetic: "/ɪnˈstɔːld/" }
      },
      {
        id: "q-load-18",
        prompt: "测试现场的环境温度和海拔是多少？",
        answers: ["What are the ambient temperature and altitude at the test site", "What are the site temperature and altitude"],
        note: "高温和高海拔可能需要降额或定制。",
        hint: { word: "altitude", meaning: "海拔", phonetic: "/ˈæltɪtjuːd/" }
      },
      {
        id: "q-load-19",
        prompt: "现场可以提供什么辅助电源？",
        answers: ["What auxiliary power supply is available on site", "Which auxiliary power supply is available at the site"],
        note: "负载本身的控制、风机或泵也需要工作电源。",
        hint: { word: "auxiliary", meaning: "辅助的", phonetic: "/ɔːɡˈzɪliəri/" }
      },
      {
        id: "q-load-20",
        prompt: "请把被测设备的规格书发给我们。",
        answers: ["Please send us the specification of the equipment under test", "Please send us the specification sheet for the equipment under test"],
        note: "拿到规格书，比反复猜参数更可靠。",
        hint: { word: "specification", meaning: "规格；技术规格书", phonetic: "/ˌspesɪfɪˈkeɪʃn/" }
      },
      {
        id: "q-load-21",
        prompt: "确认这些参数后，我们就能选型并准备报价。",
        answers: ["Once we confirm these parameters, we can select the proper model and prepare a quotation", "After confirming these parameters, we can select the right model and prepare a quotation"],
        note: "把询问参数与客户最关心的报价自然连接起来。",
        hint: { word: "parameters", meaning: "参数", phonetic: "/pəˈræmɪtəz/" }
      },
      {
        id: "q-load-22",
        prompt: "这点我需要和工程师确认后再回复您。",
        answers: ["Let me confirm this point with our engineer and get back to you", "I need to confirm this point with our engineer and get back to you"],
        note: "不会时先确认，不要为了快而承诺错误型号。",
        hint: { word: "engineer", meaning: "工程师", phonetic: "/ˌendʒɪˈnɪə/" }
      },
      {
        id: "q-load-23",
        prompt: "针对单相 UPS 的基础纯阻性带载，我们建议先看 ALB-DR 系列。",
        answers: ["For a single-phase UPS with a basic resistive load, we recommend starting with the ALB-DR series", "For basic resistive testing of a single-phase UPS, we recommend the ALB-DR series"],
        note: "先给方向，不代表已经完成最终选型。",
        hint: { word: "recommend", meaning: "推荐", phonetic: "/ˌrekəˈmend/" }
      },
      {
        id: "q-load-24",
        prompt: "对于三相发电机满载测试，ALB-SR 系列可以作为初步方向。",
        answers: ["For a three-phase generator full-load test, the ALB-SR series is a suitable starting point", "The ALB-SR series is a suitable starting point for a three-phase generator full-load test"],
        note: "如果客户还要调功率因数或复杂工况，需要继续升级判断。",
        hint: { word: "full-load", meaning: "满载的", phonetic: "/ˌfʊl ˈləʊd/" }
      },
      {
        id: "q-load-25",
        prompt: "如果需要 RLC 模拟或可调功率因数，我们应查看 PLB 或 IP-RLC 系列。",
        answers: ["If you need RLC simulation or an adjustable power factor, we should check the PLB or IP-RLC series", "For RLC simulation or adjustable power factor, we should check the PLB or IP-RLC series"],
        note: "这类需求不应直接按普通基础负载报价。",
        hint: { word: "simulation", meaning: "模拟", phonetic: "/ˌsɪmjəˈleɪʃn/" }
      },
      {
        id: "q-load-26",
        prompt: "这是稳定的电池放电，还是动态响应测试？",
        answers: ["Is this a steady battery discharge or a dynamic response test", "Do you need a steady battery discharge or a dynamic response test"],
        note: "用这句区分 DLB-LR、CRIK5000 和回馈型直流负载方向。",
        hint: { word: "discharge", meaning: "放电", phonetic: "/dɪsˈtʃɑːdʒ/" }
      },
      {
        id: "q-load-27",
        prompt: "测试现场允许把能量回馈到电网吗？",
        answers: ["Can the test site accept energy regeneration to the grid", "Does the test site allow energy to be fed back to the grid"],
        note: "回馈方案必须先确认现场并网条件。",
        hint: { word: "regeneration", meaning: "能量回馈；再生", phonetic: "/rɪˌdʒenəˈreɪʃn/" }
      },
      {
        id: "q-load-28",
        prompt: "对于长时间大功率直流测试，回馈型负载可以减少发热和能耗。",
        answers: ["For long-duration high-power DC tests, a regenerative load can reduce heat and energy consumption", "A regenerative load can reduce heat and energy consumption during long-duration high-power DC tests"],
        note: "这是 IPDC2000 的客户价值表达，不需要讲内部原理。",
        hint: { word: "consumption", meaning: "消耗；能耗", phonetic: "/kənˈsʌmpʃn/" }
      },
      {
        id: "q-load-29",
        prompt: "您需要模拟服务器电源这类非线性整流负载吗？",
        answers: ["Do you need to simulate a nonlinear rectifier load, such as a server power supply", "Do you need a nonlinear rectifier load such as a server power supply"],
        note: "出现服务器、整流型、非线性等词时，先想到 IP-RCD。",
        hint: { word: "nonlinear", meaning: "非线性的", phonetic: "/ˌnɒnˈlɪniə/" }
      },
      {
        id: "q-load-30",
        prompt: "数据中心项目要测试多少个机柜？每个机柜需要多大功率？",
        answers: ["How many racks will be tested, and what is the required power per rack", "How many racks do you need to test, and how much power is required per rack"],
        note: "数据中心验收是系统项目，不是只报一台普通负载箱。",
        hint: { word: "rack", meaning: "机柜", phonetic: "/ræk/" }
      },
      {
        id: "q-load-31",
        prompt: "断路器寿命测试采用哪个标准和动作时序？",
        answers: ["Which test standard and operating sequence do you follow for the circuit breaker endurance test", "Which standard and operating sequence are required for the circuit breaker endurance test"],
        note: "这类询盘要进入 IPATS1000 专项系统需求澄清。",
        hint: { word: "endurance", meaning: "耐久；寿命测试", phonetic: "/ɪnˈdjʊərəns/" }
      },
      {
        id: "q-load-32",
        prompt: "DLB-LR 系列用于稳定直流放电和长时间带载。",
        answers: ["The DLB-LR series is designed for stable DC discharge and long-duration loading", "The DLB-LR series is suitable for stable DC discharge and long-duration loading"],
        note: "记住客户问题：稳定耗能，不是精密动态测试。",
        hint: { word: "long-duration", meaning: "长时间的", phonetic: "/ˌlɒŋ djuˈreɪʃn/" }
      },
      {
        id: "q-load-33",
        prompt: "CRIK5000 系列支持 CC、CV、CR、CP 模式以及动态测试。",
        answers: ["The CRIK5000 series supports CC, CV, CR, and CP modes as well as dynamic testing", "The CRIK5000 series supports CC, CV, CR, CP, and dynamic testing"],
        note: "对应精密直流电子测试和自动序列。",
        hint: { word: "supports", meaning: "支持；具备", phonetic: "/səˈpɔːts/" }
      },
      {
        id: "q-load-34",
        prompt: "IPDC2000 接直流输入，而 IPAC2000 用于交流输入。",
        answers: ["The IPDC2000 handles DC input, while the IPAC2000 is designed for AC input", "The IPDC2000 is for DC input, while the IPAC2000 is for AC input"],
        note: "用一句话记住两种回馈负载的边界。",
        hint: { word: "while", meaning: "而；用于对比两件事", phonetic: "/waɪl/" }
      },
      {
        id: "q-load-35",
        prompt: "基础负载适合稳定带载，可编程负载更适合变化的测试曲线。",
        answers: ["Basic load banks are suitable for steady loading, while programmable loads are better for changing test profiles", "Basic load banks suit steady loading, while programmable loads are better for variable test profiles"],
        note: "这是向客户解释基础负载与复杂负载差异的简洁说法。",
        hint: { word: "profile", meaning: "测试曲线；测试步骤组合", phonetic: "/ˈprəʊfaɪl/" }
      },
      {
        id: "q-load-36",
        prompt: "最终选型前，我们需要确认最大值和工作循环。",
        answers: ["We need to confirm the maximum values and duty cycle before selecting the final model", "Before selecting the final model, we need to confirm the maximum values and duty cycle"],
        note: "防止过早报死型号的标准口径。",
        hint: { word: "selecting", meaning: "选择；选型", phonetic: "/sɪˈlektɪŋ/" }
      },
      {
        id: "q-load-37",
        prompt: "电压、电流、功率、控制和通讯选项可在工程确认后定制。",
        answers: ["Voltage, current, power, control, and communication options can be customized after engineering confirmation", "We can customize the voltage, current, power, control, and communication options after engineering confirmation"],
        note: "先说明可定制，再保留工程确认条件。",
        hint: { word: "confirmation", meaning: "确认", phonetic: "/ˌkɒnfəˈmeɪʃn/" }
      },
      {
        id: "q-load-38",
        prompt: "请确认数量、交货目的地和要求的交期，以便我们完成报价。",
        answers: ["Please confirm the quantity, delivery destination, and required delivery time so we can finalize the quotation", "Please confirm the quantity, destination, and required delivery date so we can finalize the quotation"],
        note: "参数确认后，用这句补齐商业报价条件。",
        hint: { word: "destination", meaning: "目的地", phonetic: "/ˌdestɪˈneɪʃn/" }
      },
      {
        id: "q-load-39",
        prompt: "连续运行能力必须结合额定功率和现场冷却条件确认。",
        answers: ["Continuous operation must be checked against the rated power and site cooling conditions", "Continuous operation needs to be confirmed based on the rated power and site cooling conditions"],
        note: "不要只凭客户一句连续运行就直接承诺。",
        hint: { word: "cooling", meaning: "冷却；散热条件", phonetic: "/ˈkuːlɪŋ/" }
      },
      {
        id: "q-load-40",
        prompt: "最终选型将以最新技术规格和实际测试条件为准。",
        answers: ["The final selection will be based on the latest technical specification and your actual test conditions", "The final model selection will be based on the latest specification and actual test conditions"],
        note: "用于规格可能更新或项目条件复杂时的稳妥收口。",
        hint: { word: "selection", meaning: "选型；选择结果", phonetic: "/sɪˈlekʃn/" }
      }
    ]
  };

  const defaultData = {
    sets: [
      {
        id: "set-daily",
        name: "外贸邮件常用句",
        description: "开发信、报价和跟进中的高频表达",
        createdAt: Date.now(),
        questions: [
          { id: "q-1", prompt: "请查收附件中的报价单。", answers: ["Please find the quotation attached", "Please find attached our quotation"], note: "quotation 也可以换成 quote", hint: CORE_HINTS["q-1"] },
          { id: "q-2", prompt: "期待收到您的回复。", answers: ["I look forward to your reply", "Looking forward to your reply"], note: "邮件结尾常用", hint: CORE_HINTS["q-2"] },
          { id: "q-3", prompt: "您的目标价格是多少？", answers: ["What is your target price", "What's your target price"], note: "", hint: CORE_HINTS["q-3"] },
          { id: "q-4", prompt: "我们可以根据您的需求定制。", answers: ["We can customize it according to your requirements", "We can customize according to your requirements"], note: "requirements 也可换成 needs", hint: CORE_HINTS["q-4"] }
        ]
      },
      {
        id: "set-words",
        name: "基础高频词",
        description: "每天都值得复习的核心词汇",
        createdAt: Date.now() + 1,
        questions: [
          { id: "q-5", prompt: "reliable", answers: ["可靠的", "值得信赖的"], note: "", hint: CORE_HINTS["q-5"] },
          { id: "q-6", prompt: "negotiate", answers: ["谈判", "协商"], note: "", hint: CORE_HINTS["q-6"] },
          { id: "q-7", prompt: "shipment", answers: ["货物", "装运", "运输的货物"], note: "", hint: CORE_HINTS["q-7"] }
        ]
      },
      TRAVEL_SET,
      LOAD_SALES_SET
    ],
    mistakes: {},
    stats: { attempts: 0, correct: 0, daily: {} },
    settings: {
      shuffle: true,
      soundEffects: true,
      autoReadQuestion: true,
      showGrammar: true
    },
    migrations: { travelPackV1: true, travelPackV2: true, keywordHintsV1: true, loadSalesPackV1: true }
  };

  let data = loadData();
  let currentView = "home";
  let selectedSetId = "all";
  let editingQuestion = null;
  let editingSetId = null;
  let session = loadSession();
  let toastTimer = null;
  let activeWord = null;
  let activeAudio = null;
  const pronunciationAudioCache = new Map();
  let audioContext = null;
  let phoneticCache = loadPhoneticCache();
  let nextEnglishVoiceGender = "male";
  let lastEnglishVoiceGender = "male";
  let answerSlotTemplate = [];
  let answerSlotSource = "";
  let cachedSpeechVoices = [];
  let speechRequestId = 0;
  let speechStartTimer = null;
  let autoReadTimer = null;
  let lastAutoReadQuestionKey = "";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const elements = {
    pageTitle: $("#pageTitle"), pageEyebrow: $("#pageEyebrow"),
    homeSetGrid: $("#homeSetGrid"), librarySetList: $("#librarySetList"), questionList: $("#questionList"),
    libraryTitle: $("#libraryTitle"), libraryCount: $("#libraryCount"), librarySetFilter: $("#librarySetFilter"),
    questionSearch: $("#questionSearch"), modalSetSelect: $("#modalSetSelect"), bulkQuestionInput: $("#bulkQuestionInput"),
    setNameInput: $("#setNameInput"), setDescriptionInput: $("#setDescriptionInput"), toast: $("#toast"),
    mistakeGroups: $("#mistakeGroups"), answerSlots: $("#answerSlots"), answerInput: $("#answerInput"), feedbackPanel: $("#feedbackPanel"),
    importFileInput: $("#importFileInput")
  };

  prepareSpeechVoices();
  bindEvents();
  renderAll();
  if (session) resumePractice();

  function loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return structuredClone(defaultData);
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed.sets)) throw new Error("Invalid data");
      return migrateData(parsed);
    } catch (error) {
      return structuredClone(defaultData);
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function migrateData(parsed) {
    parsed.mistakes = parsed.mistakes || {};
    parsed.stats = parsed.stats || { attempts: 0, correct: 0 };
    parsed.stats.daily = parsed.stats.daily || {};
    parsed.settings = { ...defaultData.settings, ...(parsed.settings || {}) };
    delete parsed.settings.autoSpace;
    delete parsed.settings.typingSound;
    parsed.migrations = parsed.migrations || {};
    parsed.sets.forEach(set => {
      set.questions = Array.isArray(set.questions) ? set.questions : [];
      set.questions.forEach(question => {
        if (!Array.isArray(question.answers)) {
          question.answers = typeof question.answer === "string" && question.answer.trim()
            ? [question.answer.trim()]
            : [];
        }
      });
    });
    if (!parsed.migrations.keywordHintsV1) {
      parsed.sets.forEach(set => set.questions.forEach(question => {
        if (!question.hint && CORE_HINTS[question.id]) question.hint = structuredClone(CORE_HINTS[question.id]);
      }));
      parsed.migrations.keywordHintsV1 = true;
    }
    if (!parsed.migrations.travelPackV1) {
      if (!parsed.sets.some(set => set.id === TRAVEL_SET.id)) parsed.sets.push(structuredClone(TRAVEL_SET));
      parsed.migrations.travelPackV1 = true;
    }
    if (!parsed.migrations.travelPackV2) {
      const currentTravelSet = parsed.sets.find(set => set.id === TRAVEL_SET.id);
      if (currentTravelSet) {
        const customQuestions = currentTravelSet.questions.filter(question => !/^q-travel-\d+$/.test(question.id));
        Object.assign(currentTravelSet, structuredClone(TRAVEL_SET));
        currentTravelSet.questions.push(...customQuestions);
      } else {
        parsed.sets.push(structuredClone(TRAVEL_SET));
      }
      parsed.migrations.travelPackV2 = true;
    }
    if (!parsed.migrations.loadSalesPackV1) {
      const currentLoadSalesSet = parsed.sets.find(set => set.id === LOAD_SALES_SET.id);
      if (currentLoadSalesSet) {
        const customQuestions = currentLoadSalesSet.questions.filter(question => !/^q-load-\d+$/.test(question.id));
        Object.assign(currentLoadSalesSet, structuredClone(LOAD_SALES_SET));
        currentLoadSalesSet.questions.push(...customQuestions);
      } else {
        parsed.sets.push(structuredClone(LOAD_SALES_SET));
      }
      parsed.migrations.loadSalesPackV1 = true;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return parsed;
  }

  function bindEvents() {
    $$(".nav-item").forEach(button => button.addEventListener("click", () => handleNavigation(button.dataset.view)));
    $("#menuButton").addEventListener("click", () => setMobileMenu(true));
    $("#sidebarScrim").addEventListener("click", () => setMobileMenu(false));

    [$("#quickAddButton"), $("#bulkAddButton")].forEach(button => button.addEventListener("click", () => openQuestionModal()));
    [$("#newSetButton"), $("#newSetSmallButton")].forEach(button => button.addEventListener("click", () => openSetModal()));
    $$(".close-modal").forEach(button => button.addEventListener("click", () => closeModal(button.dataset.closeModal)));
    $$(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", event => {
      if (event.target === backdrop) closeModal(backdrop.id);
    }));

    $("#saveQuestionsButton").addEventListener("click", saveBulkQuestions);
    $("#saveSetButton").addEventListener("click", saveNewSet);
    $("#deleteSetButton").addEventListener("click", deleteEditingSet);
    $("#manageSetButton").addEventListener("click", () => openSetModal(selectedSetId));
    $("#saveEditButton").addEventListener("click", saveQuestionEdit);
    $("#deleteQuestionButton").addEventListener("click", deleteEditingQuestion);
    elements.questionSearch.addEventListener("input", renderQuestionList);
    elements.librarySetFilter.addEventListener("change", event => selectLibrarySet(event.target.value));

    $("#startAllButton").addEventListener("click", handlePrimaryPractice);
    $("#startMistakesButton").addEventListener("click", () => startPractice("mistakes"));
    $("#mistakePracticeButton").addEventListener("click", () => startPractice("mistakes"));
    $("#answerForm").addEventListener("submit", submitAnswer);
    $("#nextQuestionButton").addEventListener("click", nextQuestion);
    $("#exitPracticeButton").addEventListener("click", pausePractice);
    $("#speakPromptButton").addEventListener("click", playNextEnglishVoice);
    $("#speakSlowButton").addEventListener("click", () => speakCurrentEnglish(0.85, lastEnglishVoiceGender));
    $("#hintButton").addEventListener("click", revealKeywordHint);
    $("#retryWrongButton").addEventListener("click", retrySessionWrong);
    $("#backHomeButton").addEventListener("click", () => switchView("home"));

    $("#exportButton").addEventListener("click", exportData);
    $("#importButton").addEventListener("click", () => elements.importFileInput.click());
    elements.importFileInput.addEventListener("change", importData);

    $("#shuffleToggle").addEventListener("change", event => updateSetting("shuffle", event.target.checked));
    $("#soundEffectsToggle").addEventListener("change", event => updateSetting("soundEffects", event.target.checked));
    $("#autoReadToggle").addEventListener("change", event => updateSetting("autoReadQuestion", event.target.checked));
    $("#grammarToggle").addEventListener("change", event => updateSetting("showGrammar", event.target.checked));
    $("#soundToggleButton").addEventListener("click", () => updateSetting("soundEffects", !data.settings.soundEffects));
    $("#playUsButton").addEventListener("click", () => playPronunciation("us"));
    $("#playUkButton").addEventListener("click", () => playPronunciation("uk"));
    elements.answerSlots.addEventListener("input", handleAnswerSlotInput);
    elements.answerSlots.addEventListener("keydown", handleAnswerSlotKeydown);
    elements.answerSlots.addEventListener("paste", handleAnswerSlotPaste);

    document.addEventListener("click", event => {
      const wordButton = event.target.closest(".word-token");
      if (wordButton) openWordCoach(wordButton.dataset.word);
    });

    document.addEventListener("pointerdown", wakeSpeechEngine, { passive: true });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        $$(".modal-backdrop.open").forEach(modal => closeModal(modal.id));
        setMobileMenu(false);
      }
      if (event.repeat || currentView !== "practice" || $$(".modal-backdrop.open").length) return;
      const noModifiers = !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
      if (event.key === "Enter" && noModifiers) {
        event.preventDefault();
        event.stopPropagation();
        runPrimaryPracticeAction();
        return;
      }
      if (event.key === "F2") {
        event.preventDefault();
        event.stopPropagation();
        speakCurrentEnglish(0.92, lastEnglishVoiceGender);
        return;
      }
      if (event.key === "F3") {
        event.preventDefault();
        event.stopPropagation();
        revealKeywordHint();
        return;
      }
      if (event.key === "F4") {
        event.preventDefault();
        event.stopPropagation();
        updateSetting("showGrammar", !data.settings.showGrammar);
        return;
      }
      if (event.key === "F5") {
        event.preventDefault();
        event.stopPropagation();
        runPrimaryPracticeAction();
      }
    }, true);
  }

  function runPrimaryPracticeAction() {
    if (!session || currentView !== "practice") return;
    if (session.answered) {
      nextQuestion();
      return;
    }
    $("#answerForm").requestSubmit();
  }

  function handleAnswerSlotInput(event) {
    const input = event.target.closest(".answer-word-input");
    if (!input || !session || session.answered || event.isComposing) return;
    input.value = input.value.replace(/\s+/g, "");
    if (switchAnswerSlotVariant(input)) return;
    const slot = input.closest(".answer-slot");
    const expected = input.dataset.expected || "";
    const typed = normalizeSlotWord(input.value);
    const exact = typed === normalizeSlotWord(expected);
    slot.classList.toggle("is-complete", exact);
    slot.classList.toggle("is-error", Boolean(typed) && !normalizeSlotWord(expected).startsWith(typed));
    syncAnswerFromSlots();
    if (session.questionAttempts > 0 && elements.feedbackPanel.classList.contains("retry")) {
      renderAttemptReview(session.questions[session.index], session.draft);
    }
    persistSession();
    if (exact) focusNextAnswerSlot(input);
  }

  function handleAnswerSlotKeydown(event) {
    const input = event.target.closest(".answer-word-input");
    if (!input || !session || session.answered || event.isComposing) return;
    if (event.key === " ") {
      event.preventDefault();
      if (switchAnswerSlotVariant(input, true)) return;
      if (normalizeSlotWord(input.value) === normalizeSlotWord(input.dataset.expected)) focusNextAnswerSlot(input);
      return;
    }
    const inputs = answerWordInputs();
    const index = inputs.indexOf(input);
    if (event.key === "Backspace" && !input.value && index > 0) {
      event.preventDefault();
      inputs[index - 1].focus();
      inputs[index - 1].setSelectionRange(inputs[index - 1].value.length, inputs[index - 1].value.length);
    }
    if (event.key === "ArrowLeft" && input.selectionStart === 0 && index > 0) {
      event.preventDefault();
      inputs[index - 1].focus();
    }
    if (event.key === "ArrowRight" && input.selectionStart === input.value.length && index < inputs.length - 1) {
      event.preventDefault();
      inputs[index + 1].focus();
    }
  }

  function handleAnswerSlotPaste(event) {
    const input = event.target.closest(".answer-word-input");
    if (!input || !session || session.answered) return;
    const text = event.clipboardData?.getData("text") || "";
    const words = tokenizeAnswerTemplate(text).filter(isAnswerWordToken);
    if (words.length <= 1) return;
    event.preventDefault();
    const inputs = answerWordInputs();
    const start = Math.max(0, inputs.indexOf(input));
    words.forEach((word, offset) => {
      const target = inputs[start + offset];
      if (!target) return;
      target.value = word;
      const slot = target.closest(".answer-slot");
      const exact = normalizeSlotWord(word) === normalizeSlotWord(target.dataset.expected);
      slot.classList.toggle("is-complete", exact);
      slot.classList.toggle("is-error", !exact);
    });
    syncAnswerFromSlots();
    focusFirstOpenSlot(start);
  }

  function tokenizeAnswerTemplate(value) {
    return String(value).match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu) || [];
  }

  function isAnswerWordToken(token) {
    return /[\p{L}\p{N}]/u.test(token);
  }

  function normalizeSlotWord(value) {
    return String(value).toLowerCase().replace(/’/g, "'").trim();
  }

  function answerWordInputs() {
    return $$(".answer-word-input", elements.answerSlots);
  }

  function focusNextAnswerSlot(current) {
    const inputs = answerWordInputs();
    const next = inputs[inputs.indexOf(current) + 1];
    if (next) {
      next.focus();
      next.select();
      return;
    }
    current.blur();
  }

  function focusFirstOpenSlot(startIndex = 0) {
    const inputs = answerWordInputs();
    const target = inputs.slice(startIndex).find(input => (
      normalizeSlotWord(input.value) !== normalizeSlotWord(input.dataset.expected)
    )) || inputs.find(input => !input.disabled);
    if (!target || target.disabled) return;
    target.focus();
    target.select();
  }

  function syncAnswerFromSlots() {
    const inputs = answerWordInputs();
    let wordIndex = 0;
    const text = answerSlotTemplate.map(token => {
      if (token.type === "punctuation") return token.value;
      const value = inputs[wordIndex]?.value || "";
      wordIndex += 1;
      return value;
    }).filter(Boolean).join(" ")
      .replace(/\s+([,.;!?])/g, "$1")
      .replace(/([([{])\s+/g, "$1")
      .replace(/\s+([)\]}])/g, "$1")
      .trim();
    elements.answerInput.value = text;
    if (session && !session.answered) session.draft = text;
    return text;
  }

  function setAnswerSlotsDisabled(disabled) {
    answerWordInputs().forEach(input => { input.disabled = disabled; });
    elements.answerSlots.classList.toggle("is-disabled", disabled);
  }

  function markWrongAnswerSlots() {
    answerWordInputs().forEach(input => {
      const exact = normalizeSlotWord(input.value) === normalizeSlotWord(input.dataset.expected);
      input.closest(".answer-slot").classList.toggle("is-complete", exact);
      input.closest(".answer-slot").classList.toggle("is-error", !exact);
    });
  }

  function chooseAnswerSlotSource(question, draft = "") {
    const answers = acceptedAnswersFor(question).filter(answer => /[A-Za-z0-9]/.test(answer));
    const fallback = answers[0] || question?.answers?.[0] || "";
    const draftWords = tokenizeAnswerTemplate(draft).filter(isAnswerWordToken).map(normalizeSlotWord);
    if (!draftWords.length) return fallback;
    return answers.find(answer => {
      const answerWords = tokenizeAnswerTemplate(answer).filter(isAnswerWordToken).map(normalizeSlotWord);
      return draftWords.length <= answerWords.length
        && draftWords.every((word, index) => word === answerWords[index]);
    }) || fallback;
  }

  function switchAnswerSlotVariant(currentInput, force = false) {
    const inputs = answerWordInputs();
    const currentIndex = inputs.indexOf(currentInput);
    if (currentIndex < 0) return false;
    const typedWords = inputs.slice(0, currentIndex + 1).map(input => input.value.trim());
    if (typedWords.some(word => !word)) return false;
    const question = session?.questions?.[session.index];
    const normalizedTyped = typedWords.map(normalizeSlotWord);
    const hasLongerCurrentWord = acceptedAnswersFor(question).some(answer => {
      const answerWords = tokenizeAnswerTemplate(answer).filter(isAnswerWordToken).map(normalizeSlotWord);
      return normalizedTyped.slice(0, -1).every((word, index) => word === answerWords[index])
        && answerWords[currentIndex]?.startsWith(normalizedTyped[currentIndex])
        && answerWords[currentIndex] !== normalizedTyped[currentIndex];
    });
    if (!force && hasLongerCurrentWord) return false;
    const candidate = chooseAnswerSlotSource(question, typedWords.join(" "));
    if (!candidate || candidate === answerSlotSource) return false;
    session.draft = typedWords.join(" ");
    renderAnswerSlots(question, session.draft, false);
    persistSession();
    const newInputs = answerWordInputs();
    const newCurrent = newInputs[Math.min(currentIndex, newInputs.length - 1)];
    const exact = newCurrent
      && normalizeSlotWord(newCurrent.value) === normalizeSlotWord(newCurrent.dataset.expected);
    requestAnimationFrame(() => {
      if (exact) focusNextAnswerSlot(newCurrent);
      else newCurrent?.focus();
    });
    return true;
  }

  function renderAnswerSlots(question, draft = "", disabled = false) {
    const answer = chooseAnswerSlotSource(question, draft);
    answerSlotSource = answer;
    answerSlotTemplate = tokenizeAnswerTemplate(answer).map(token => ({
      type: isAnswerWordToken(token) ? "word" : "punctuation",
      value: token
    }));
    const draftWords = tokenizeAnswerTemplate(draft).filter(isAnswerWordToken);
    let wordIndex = 0;
    elements.answerSlots.innerHTML = answerSlotTemplate.map(token => {
      if (token.type === "punctuation") {
        return `<span class="answer-punctuation" aria-hidden="true">${escapeHtml(token.value)}</span>`;
      }
      const expected = token.value;
      const value = draftWords[wordIndex] || "";
      const complete = normalizeSlotWord(value) === normalizeSlotWord(expected);
      const currentIndex = wordIndex;
      // Use a real pixel allowance because proportional-font words can be
      // considerably wider than their `ch` count (for example, "negotiate").
      const slotWidth = Math.max(92, Math.min(expected.length * 12 + 28, 360));
      wordIndex += 1;
      return `<label class="answer-slot ${complete ? "is-complete" : ""}" style="--slot-width:${slotWidth}px">
        <span class="sr-only">第 ${currentIndex + 1} 个词</span>
        <input class="answer-word-input" type="text" value="${escapeHtml(value)}" data-expected="${escapeHtml(expected)}"
          aria-label="第 ${currentIndex + 1} 个词" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="${Math.max(expected.length + 5, 12)}">
      </label>`;
    }).join("");
    setAnswerSlotsDisabled(disabled);
    syncAnswerFromSlots();
  }

  function tokenizeGrammarWords(value) {
    return String(value)
      .toLowerCase()
      .replace(/[’]/g, "'")
      .match(/[a-z0-9]+(?:'[a-z0-9]+)*(?:-[a-z0-9]+)*/g) || [];
  }

  function handleNavigation(view) {
    if (view === "home" && session && !session.completed) {
      resumePractice();
      return;
    }
    switchView(view);
  }

  function handlePrimaryPractice() {
    if (session && !session.completed) {
      resumePractice();
      return;
    }
    startPractice("all");
  }

  function switchView(view) {
    currentView = view;
    $$(".view").forEach(section => section.classList.remove("active"));
    const navigationView = ["practice", "result"].includes(view) ? "home" : view;
    $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === navigationView));
    setMobileMenu(false);

    const page = view === "mistakes" ? "mistakes" : view;
    const target = $(`#${page}View`);
    if (target) target.classList.add("active");

    const titles = {
      home: ["DAILY PRACTICE", "今天继续开口、动手、记住"],
      library: ["QUESTION LIBRARY", "管理你的个人英语题库"],
      mistakes: ["REVIEW & REPEAT", "把每一道错题变成已经会做的题"],
      practice: ["FOCUS MODE", "专心完成这一轮练习"],
      result: ["PRACTICE RESULT", "这一轮，你又多记住了一点"]
    };
    const [eyebrow, title] = titles[view] || titles.home;
    elements.pageEyebrow.textContent = eyebrow;
    elements.pageTitle.textContent = title;
    $("#quickAddButton").style.visibility = ["practice", "result"].includes(view) ? "hidden" : "visible";

    if (view === "library") renderLibrary();
    if (view === "mistakes") renderMistakes();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderAll() {
    renderSettings();
    renderVoiceCycleButton();
    renderStats();
    renderResumeState();
    renderSetCards();
    renderSetOptions();
    renderLibrary();
    renderMistakes();
  }

  function renderResumeState() {
    const resumable = session && !session.completed;
    $("#startAllButton").innerHTML = resumable ? `继续第 ${session.index + 1} 题 <span>→</span>` : `开始练习 <span>→</span>`;
    if (resumable) {
      $("#homeSummary").textContent = `本轮进度已保存：第 ${session.index + 1} / ${session.questions.length} 题，返回后从这里继续。`;
    }
  }

  function allQuestions() {
    return data.sets.flatMap(set => set.questions.map(question => ({ ...question, setId: set.id, setName: set.name })));
  }

  function mistakeQuestions() {
    return allQuestions().filter(question => data.mistakes[question.id]);
  }

  function renderStats() {
    const total = allQuestions().length;
    const mistakes = mistakeQuestions().length;
    const accuracy = data.stats.attempts ? Math.round(data.stats.correct / data.stats.attempts * 100) : 0;
    $("#metricQuestions").textContent = total;
    $("#metricMistakes").textContent = mistakes;
    $("#metricAccuracy").textContent = `${accuracy}%`;
    $("#metricAttempts").textContent = data.stats.attempts ? `已作答 ${data.stats.attempts} 次` : "尚未开始练习";
    const today = data.stats.daily[todayKey()] || 0;
    $("#metricToday").textContent = today;
    $("#metricTodayNote").textContent = today >= 20 ? "今天练得很扎实" : today >= 8 ? "状态已经热起来了" : today ? "保持这个节奏" : "从一道题开始热身";
    $("#navMistakeCount").textContent = mistakes;
    $("#sidebarTotal").textContent = `${total} 道题`;
    $("#sidebarAccuracy").textContent = `累计正确率 ${accuracy}%`;
    $("#sidebarProgress").style.width = `${accuracy}%`;
    $("#homeSummary").textContent = mistakes
      ? `题库中现有 ${total} 道题，其中 ${mistakes} 道等着你重新拿下。`
      : `题库中现有 ${total} 道题，答错的题会自动进入错题本。`;
  }

  function renderSettings() {
    $("#shuffleToggle").checked = data.settings.shuffle;
    $("#soundEffectsToggle").checked = data.settings.soundEffects;
    $("#autoReadToggle").checked = data.settings.autoReadQuestion;
    $("#grammarToggle").checked = data.settings.showGrammar;
    const button = $("#soundToggleButton");
    button.classList.toggle("muted", !data.settings.soundEffects);
    button.setAttribute("aria-pressed", String(data.settings.soundEffects));
    button.setAttribute("aria-label", data.settings.soundEffects ? "关闭反馈音效" : "开启反馈音效");
    button.title = data.settings.soundEffects ? "关闭反馈音效" : "开启反馈音效";
  }

  function updateSetting(key, value) {
    data.settings[key] = value;
    saveData();
    renderSettings();
    if (key === "soundEffects" && value) playFeedbackSound(true, true);
    if (key === "autoReadQuestion" && !value) {
      clearTimeout(autoReadTimer);
      window.speechSynthesis?.cancel();
    }
    if (key === "autoReadQuestion" && value && session && currentView === "practice") {
      lastAutoReadQuestionKey = "";
      queueAutoRead(session.questions[session.index]);
    }
    if (key === "showGrammar" && session && currentView === "practice") {
      renderGrammarGuide(session.questions[session.index]);
    }
  }

  function renderSetCards() {
    if (!data.sets.length) {
      elements.homeSetGrid.innerHTML = emptyState("还没有题库", "创建第一个题库，然后录入你想练的内容。", "新建题库", "new-set");
      bindEmptyActions();
      return;
    }
    elements.homeSetGrid.innerHTML = data.sets.map((set, index) => {
      const mistakes = set.questions.filter(q => data.mistakes[q.id]).length;
      return `<article class="set-card">
        <div class="set-card-top"><span class="set-index">SET ${String(index + 1).padStart(2, "0")}</span>${mistakes ? `<span class="mistake-chip">${mistakes} 道错题</span>` : ""}</div>
        <h3>${escapeHtml(set.name)}</h3>
        <p>${escapeHtml(set.description || "你的自定义练习题库")}</p>
        <div class="set-card-footer"><span>${set.questions.length} 道题</span><button data-practice-set="${set.id}">开始练习 →</button></div>
      </article>`;
    }).join("");
    $$('[data-practice-set]').forEach(button => button.addEventListener("click", () => startPractice("set", button.dataset.practiceSet)));
  }

  function renderSetOptions() {
    const options = data.sets.map(set => `<option value="${set.id}">${escapeHtml(set.name)}（${set.questions.length}题）</option>`).join("");
    elements.modalSetSelect.innerHTML = options;
    elements.librarySetFilter.innerHTML = `<option value="all">全部题库</option>${options}`;
    elements.librarySetFilter.value = selectedSetId;
  }

  function renderLibrary() {
    renderSetOptions();
    const allCount = allQuestions().length;
    elements.librarySetList.innerHTML = `<button class="set-list-item ${selectedSetId === "all" ? "active" : ""}" data-library-set="all"><span>全部题目</span><span>${allCount}</span></button>` +
      data.sets.map(set => `<button class="set-list-item ${selectedSetId === set.id ? "active" : ""}" data-library-set="${set.id}"><span>${escapeHtml(set.name)}</span><span>${set.questions.length}</span></button>`).join("");
    $$('[data-library-set]').forEach(button => button.addEventListener("click", () => selectLibrarySet(button.dataset.librarySet)));
    renderQuestionList();
  }

  function selectLibrarySet(setId) {
    selectedSetId = setId;
    elements.librarySetFilter.value = setId;
    renderLibrary();
  }

  function renderQuestionList() {
    const search = normalize(elements.questionSearch.value || "");
    let questions = selectedSetId === "all" ? allQuestions() : allQuestions().filter(q => q.setId === selectedSetId);
    questions = questions.filter(q => !search || normalize(`${q.prompt} ${q.answers.join(" ")}`).includes(search));
    const set = data.sets.find(item => item.id === selectedSetId);
    elements.libraryTitle.textContent = set ? set.name : "全部题目";
    elements.libraryCount.textContent = `${questions.length} 道题`;
    $("#manageSetButton").hidden = !set;

    if (!questions.length) {
      elements.questionList.innerHTML = emptyState(search ? "没搜到匹配题目" : "这个题库还是空的", search ? "换一个关键词试试。" : "录入一些题目，就可以开始练习了。", search ? "" : "录入题目", "add-questions");
      bindEmptyActions();
      return;
    }

    elements.questionList.innerHTML = questions.map((question, index) => `<div class="question-item">
      <span class="question-number">${String(index + 1).padStart(2, "0")}</span>
      <div class="question-copy"><span>QUESTION</span><strong>${renderInteractiveEnglish(question.prompt)}</strong></div>
      <div class="answer-copy"><span>ANSWER</span><strong>${question.answers.map(renderInteractiveEnglish).join(" / ")}</strong></div>
      <div class="question-actions">
        <button data-speak-question="${question.id}" title="朗读" aria-label="朗读">▷</button>
        <button data-edit-question="${question.id}" title="编辑" aria-label="编辑">…</button>
      </div>
    </div>`).join("");
    $$('[data-speak-question]').forEach(button => button.addEventListener("click", () => {
      const question = allQuestions().find(q => q.id === button.dataset.speakQuestion);
      if (question) speakQuestionEnglish(question);
    }));
    $$('[data-edit-question]').forEach(button => button.addEventListener("click", () => openEditModal(button.dataset.editQuestion)));
  }

  function renderMistakes() {
    const mistakes = mistakeQuestions();
    $("#mistakePracticeButton").disabled = !mistakes.length;
    if (!mistakes.length) {
      elements.mistakeGroups.innerHTML = emptyState("错题本现在是空的", "开始一轮练习，答错的题会自动收到这里。", "去练习", "practice-all");
      bindEmptyActions();
      return;
    }
    const groups = data.sets.map(set => ({ set, questions: mistakes.filter(q => q.setId === set.id) })).filter(group => group.questions.length);
    elements.mistakeGroups.innerHTML = groups.map(({ set, questions }) => `<section class="mistake-group">
      <header><h3>${escapeHtml(set.name)}</h3><span>${questions.length} 道</span></header>
      ${questions.map(question => {
        const record = data.mistakes[question.id];
        return `<div class="mistake-row"><strong>${renderInteractiveEnglish(question.prompt)}</strong><span>${question.answers.map(renderInteractiveEnglish).join(" / ")}</span><small>错过 ${record.count || 1} 次</small></div>`;
      }).join("")}
    </section>`).join("");
  }

  function openQuestionModal(preferredSetId) {
    if (!data.sets.length) {
      openSetModal();
      showToast("请先创建一个题库");
      return;
    }
    renderSetOptions();
    const targetId = preferredSetId || (selectedSetId !== "all" ? selectedSetId : data.sets[0].id);
    elements.modalSetSelect.value = targetId;
    elements.bulkQuestionInput.value = "";
    openModal("questionModal");
    setTimeout(() => elements.bulkQuestionInput.focus(), 50);
  }

  function saveBulkQuestions() {
    const set = data.sets.find(item => item.id === elements.modalSetSelect.value);
    const lines = elements.bulkQuestionInput.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const parsed = [];
    const invalid = [];
    lines.forEach((line, index) => {
      const delimiter = line.includes("|") ? "|" : "\t";
      const parts = line.split(delimiter).map(part => part.trim());
      if (parts.length < 2 || !parts[0] || !parts[1]) {
        invalid.push(index + 1);
        return;
      }
      const prompt = parts[0];
      const answerText = parts[1];
      const answers = answerText.split("/").map(answer => answer.trim()).filter(Boolean);
      const hintParts = (parts.slice(2).join(delimiter) || "").split(/[,，]/).map(value => value.trim());
      const hint = hintParts[0] ? { word: hintParts[0], meaning: hintParts[1] || "关键词提示", phonetic: hintParts[2] || "" } : undefined;
      parsed.push({ id: uid("q"), prompt, answers, note: "", ...(hint ? { hint } : {}) });
    });
    if (!set || !parsed.length) {
      showToast(invalid.length ? `第 ${invalid.join("、")} 行格式不对` : "请先输入题目和答案");
      return;
    }
    set.questions.push(...parsed);
    saveData();
    closeModal("questionModal");
    renderAll();
    showToast(`已加入 ${parsed.length} 道题${invalid.length ? `，略过 ${invalid.length} 行` : ""}`);
  }

  function openSetModal(setId) {
    const set = data.sets.find(item => item.id === setId);
    editingSetId = set ? set.id : null;
    elements.setNameInput.value = set ? set.name : "";
    elements.setDescriptionInput.value = set ? set.description || "" : "";
    $("#setModalTitle").textContent = set ? "管理题库" : "新建题库";
    $("#saveSetButton").textContent = set ? "保存修改" : "创建题库";
    $("#deleteSetButton").hidden = !set;
    openModal("setModal");
    setTimeout(() => elements.setNameInput.focus(), 50);
  }

  function saveNewSet() {
    const name = elements.setNameInput.value.trim();
    if (!name) {
      showToast("请输入题库名称");
      elements.setNameInput.focus();
      return;
    }
    if (editingSetId) {
      const set = data.sets.find(item => item.id === editingSetId);
      if (!set) return;
      set.name = name;
      set.description = elements.setDescriptionInput.value.trim();
      saveData();
      closeModal("setModal");
      renderAll();
      showToast("题库信息已更新");
      return;
    }
    const set = { id: uid("set"), name, description: elements.setDescriptionInput.value.trim(), createdAt: Date.now(), questions: [] };
    data.sets.push(set);
    selectedSetId = set.id;
    saveData();
    closeModal("setModal");
    renderAll();
    showToast("题库已创建，现在可以录题了");
    setTimeout(() => openQuestionModal(set.id), 220);
  }

  function deleteEditingSet() {
    const set = data.sets.find(item => item.id === editingSetId);
    if (!set || !window.confirm(`确定删除题库“${set.name}”和其中 ${set.questions.length} 道题吗？`)) return;
    set.questions.forEach(question => delete data.mistakes[question.id]);
    if (session?.questions.some(question => question.setId === set.id)) clearSession();
    data.sets = data.sets.filter(item => item.id !== set.id);
    selectedSetId = "all";
    editingSetId = null;
    saveData();
    closeModal("setModal");
    renderAll();
    showToast("题库已删除");
  }

  function openEditModal(questionId) {
    const question = allQuestions().find(q => q.id === questionId);
    if (!question) return;
    editingQuestion = { questionId, setId: question.setId };
    $("#editPromptInput").value = question.prompt;
    $("#editAnswerInput").value = question.answers.join(" / ");
    $("#editNoteInput").value = question.note || "";
    $("#editHintWordInput").value = question.hint?.word || "";
    $("#editHintMeaningInput").value = question.hint?.meaning || "";
    $("#editHintPhoneticInput").value = question.hint?.phonetic || "";
    openModal("editModal");
  }

  function saveQuestionEdit() {
    if (!editingQuestion) return;
    const set = data.sets.find(item => item.id === editingQuestion.setId);
    const question = set && set.questions.find(item => item.id === editingQuestion.questionId);
    const prompt = $("#editPromptInput").value.trim();
    const answers = $("#editAnswerInput").value.split("/").map(value => value.trim()).filter(Boolean);
    if (!question || !prompt || !answers.length) {
      showToast("题目和正确答案不能为空");
      return;
    }
    question.prompt = prompt;
    question.answers = answers;
    question.note = $("#editNoteInput").value.trim();
    const hintWord = $("#editHintWordInput").value.trim();
    question.hint = hintWord ? {
      word: hintWord,
      meaning: $("#editHintMeaningInput").value.trim() || "关键词提示",
      phonetic: $("#editHintPhoneticInput").value.trim()
    } : undefined;
    if (session) {
      session.questions = session.questions.map(item => item.id === question.id
        ? { ...question, setId: set.id, setName: set.name }
        : item);
      persistSession();
    }
    saveData();
    closeModal("editModal");
    renderAll();
    showToast("题目已更新");
  }

  function deleteEditingQuestion() {
    if (!editingQuestion) return;
    const set = data.sets.find(item => item.id === editingQuestion.setId);
    const question = set && set.questions.find(item => item.id === editingQuestion.questionId);
    if (!question || !window.confirm(`确定删除题目“${question.prompt}”吗？`)) return;
    if (session?.questions.some(item => item.id === question.id)) clearSession();
    set.questions = set.questions.filter(item => item.id !== question.id);
    delete data.mistakes[question.id];
    saveData();
    closeModal("editModal");
    renderAll();
    showToast("题目已删除");
  }

  function startPractice(mode, setId, suppliedQuestions) {
    if (session && !session.completed && !suppliedQuestions) {
      const replace = window.confirm("当前练习进度已经保存。确定开始一轮新的练习吗？");
      if (!replace) {
        resumePractice();
        return;
      }
    }
    let questions = suppliedQuestions || (mode === "mistakes"
      ? mistakeQuestions()
      : mode === "set"
        ? allQuestions().filter(q => q.setId === setId)
        : allQuestions());
    if (!questions.length) {
      showToast(mode === "mistakes" ? "目前没有错题" : "题库还是空的，先录几道题吧");
      return;
    }
    questions = data.settings.shuffle ? shuffle([...questions]) : [...questions];
    session = {
      mode, setId, questions, index: 0, correct: 0, wrong: [], answered: false,
      draft: "", lastTyped: "", lastCorrect: null, hintRevealed: false, questionAttempts: 0,
      startedAt: Date.now(), completed: false
    };
    lastAutoReadQuestionKey = "";
    persistSession();
    switchView("practice");
    renderPracticeQuestion();
  }

  function resumePractice() {
    if (!session || session.completed) {
      switchView("home");
      return;
    }
    switchView("practice");
    renderPracticeQuestion({ restore: true });
  }

  function pausePractice() {
    if (session && !session.answered) session.draft = syncAnswerFromSlots();
    clearTimeout(autoReadTimer);
    window.speechSynthesis?.cancel();
    persistSession();
    switchView("home");
    renderResumeState();
  }

  function renderPracticeQuestion(options = {}) {
    const question = session.questions[session.index];
    if (!question) {
      clearSession();
      switchView("home");
      return;
    }
    if (!options.restore) {
      session.answered = false;
      session.draft = "";
      session.lastTyped = "";
      session.lastCorrect = null;
      session.hintRevealed = false;
      session.questionAttempts = 0;
    }
    $("#practiceCurrent").textContent = session.index + 1;
    $("#practiceTotal").textContent = session.questions.length;
    $("#practiceProgressBar").style.width = `${session.index / session.questions.length * 100}%`;
    $("#practiceSetName").textContent = question.setName;
    $("#practicePrompt").innerHTML = renderInteractiveEnglish(question.prompt);
    $("#practiceHint").textContent = "在下方逐词输入答案，当前词正确后会自动跳到下一格";
    renderGrammarGuide(question);
    renderAnswerSlots(question, session.answered ? session.lastTyped : (session.draft || ""), Boolean(session.answered));
    updatePrimaryPracticeAction();
    $("#hintButton").disabled = Boolean(session.answered);
    elements.feedbackPanel.className = "feedback";
    $("#nextQuestionButton").hidden = false;
    $("#questionStage").classList.remove("is-correct", "is-wrong");
    $("#feedbackBurst").replaceChildren();
    updateAttemptCounter();
    hideKeywordHint();
    if (session.hintRevealed) revealKeywordHint({ restored: true });
    if (session.answered && typeof session.lastCorrect === "boolean") {
      showFeedback(session.lastCorrect, question, session.lastTyped, { silent: true, focus: false });
    } else {
      if (session.questionAttempts > 0 && session.lastTyped) {
        showRetryFeedback(question, session.lastTyped, { silent: true, focus: false });
      }
      setTimeout(() => focusFirstOpenSlot(), 30);
      queueAutoRead(question);
    }
    persistSession();
  }

  function queueAutoRead(question) {
    clearTimeout(autoReadTimer);
    if (!data.settings.autoReadQuestion || currentView !== "practice" || !question) return;
    const key = `${question.id}:${session?.index ?? 0}`;
    if (key === lastAutoReadQuestionKey) return;
    lastAutoReadQuestionKey = key;
    autoReadTimer = setTimeout(() => {
      const currentQuestion = session?.questions?.[session.index];
      if (currentView === "practice" && currentQuestion?.id === question.id && !session.answered) {
        speakQuestionEnglish(question, 0.92, lastEnglishVoiceGender);
      }
    }, 70);
  }

  function updatePrimaryPracticeAction() {
    const button = $(".answer-submit");
    if (!button || !session) return;
    button.disabled = false;
    button.textContent = session.answered
      ? (session.index === session.questions.length - 1 ? "查看结果" : "下一题")
      : "提交答案";
  }

  function renderGrammarGuide(question) {
    const guide = $("#grammarGuide");
    const text = englishReferenceFor(question);
    if (!guide || !data.settings.showGrammar || !text) {
      if (guide) guide.hidden = true;
      return;
    }
    guide.hidden = false;
    $("#grammarPattern").textContent = describeSentencePattern(text);
    const tokens = tokenizeGrammarText(text);
    $("#grammarTokens").innerHTML = tokens.map((token, index) => {
      if (/^[.,!?;:]$/.test(token)) return `<span class="grammar-punctuation">${escapeHtml(token)}</span>`;
      const grammar = classifyGrammarToken(token, index, tokens);
      return `<button type="button" class="grammar-token word-token" data-word="${escapeHtml(token)}" style="--token-color:${grammar.color}">
        <span class="grammar-token-kind">${grammar.label}</span>
        <span class="grammar-token-word">${escapeHtml(token)}</span>
      </button>`;
    }).join("");
  }

  function englishReferenceFor(question) {
    if (!question) return "";
    return question.answers?.find(answer => /[A-Za-z]/.test(answer))
      || (/[A-Za-z]/.test(question.prompt || "") ? question.prompt : "");
  }

  function tokenizeGrammarText(value) {
    return String(value).match(/[A-Za-z0-9]+(?:[’'][A-Za-z0-9]+)*(?:-[A-Za-z0-9]+)*|[.,!?;:]/g) || [];
  }

  function describeSentencePattern(text) {
    const words = tokenizeGrammarWords(text);
    if (!words.length) return "句型结构";
    const first = words[0];
    if (GRAMMAR_WORDS.questionWords.has(first)) return "疑问词 + 助动词 + 主语 + 谓语（特殊疑问句）";
    if (GRAMMAR_WORDS.modals.has(first) || GRAMMAR_WORDS.auxiliaries.has(first)) {
      return "助动词 / 情态动词 + 主语 + 谓语（一般疑问句）";
    }
    if (first === "let" || first === "let's" || first === "please" || GRAMMAR_WORDS.commonVerbs.has(first)) {
      return "谓语 + 宾语 / 补充信息（祈使句）";
    }
    const modalIndex = words.findIndex(word => GRAMMAR_WORDS.modals.has(word));
    const beIndex = words.findIndex(word => ["be", "been", "being", "is", "are", "was", "were"].includes(word));
    const hasParticiple = words.some((word, index) => index > beIndex && /(ed|en)$/.test(word));
    if (modalIndex > 0 && beIndex > modalIndex && hasParticiple) return "主语 + 情态动词 + 被动语态 + 补充信息";
    if (beIndex > 0 && hasParticiple) return "主语 + be 动词 + 过去分词（被动语态）";
    if (words.some(word => GRAMMAR_WORDS.conjunctions.has(word))) return "主句 + 连词 + 分句";
    return "主语 + 谓语 + 宾语 / 补充信息";
  }

  function classifyGrammarToken(token, index, tokens) {
    const word = token.toLowerCase().replace(/’/g, "'");
    const previous = (tokens[index - 1] || "").toLowerCase();
    if (GRAMMAR_WORDS.questionWords.has(word)) return { label: "疑问词", color: "#8c63bd" };
    if (GRAMMAR_WORDS.modals.has(word)) return { label: "情态动词", color: "#b36832" };
    if (GRAMMAR_WORDS.auxiliaries.has(word) || /^(it's|what's|where's|who's)$/.test(word)) return { label: "be / 助动词", color: "#cc6a55" };
    if (GRAMMAR_WORDS.pronouns.has(word)) return { label: index === 0 || GRAMMAR_WORDS.conjunctions.has(previous) ? "主语 / 代词" : "代词", color: "#247b6b" };
    if (GRAMMAR_WORDS.articles.has(word)) return { label: "冠词", color: "#9b7a22" };
    if (GRAMMAR_WORDS.conjunctions.has(word)) return { label: "连词", color: "#7864a8" };
    if (GRAMMAR_WORDS.prepositions.has(word)) return { label: "介词", color: "#3776a8" };
    if (/^\d/.test(word) || /^(hz|khz|v|kv|a|kw|kva)$/.test(word)) return { label: "数字 / 单位", color: "#737d39" };
    if (/ly$/.test(word)) return { label: "副词", color: "#a76886" };
    if (GRAMMAR_WORDS.commonAdjectives.has(word) || /(able|ible|ive|al|ous|ful|less|ic)$/.test(word)) return { label: "形容词", color: "#b47b2e" };
    if (GRAMMAR_WORDS.commonVerbs.has(word) || /(ing|ed|en)$/.test(word) || previous === "to") return { label: "谓语 / 动词", color: "#2d75b5" };
    if (index === 0) return { label: "主语 / 名词", color: "#247b6b" };
    return { label: "核心词", color: "#5c7770" };
  }

  function submitAnswer(event) {
    event.preventDefault();
    if (!session) return;
    if (session.answered) {
      nextQuestion();
      return;
    }
    const typed = syncAnswerFromSlots().trim();
    if (!typed) {
      showToast("先输入你的答案");
      return;
    }
    const question = session.questions[session.index];
    const correct = acceptedAnswersFor(question).some(answer => isAccepted(typed, answer));
    session.questionAttempts = Math.min((session.questionAttempts || 0) + 1, MAX_ATTEMPTS);
    session.draft = typed;
    session.lastTyped = typed;
    session.lastCorrect = correct;
    if (!correct && session.questionAttempts < MAX_ATTEMPTS) {
      showRetryFeedback(question, typed);
      updateAttemptCounter();
      persistSession();
      return;
    }

    session.answered = true;
    data.stats.attempts += 1;
    data.stats.daily[todayKey()] = (data.stats.daily[todayKey()] || 0) + 1;
    if (correct) {
      session.correct += 1;
      data.stats.correct += 1;
      delete data.mistakes[question.id];
    } else {
      session.wrong.push(question);
      const previous = data.mistakes[question.id] || { count: 0 };
      data.mistakes[question.id] = { count: previous.count + 1, lastWrongAt: Date.now(), lastAnswer: typed };
    }
    saveData();
    showFeedback(correct, question, typed);
    persistSession();
    renderStats();
    setAnswerSlotsDisabled(true);
    updatePrimaryPracticeAction();
    $("#hintButton").disabled = true;
    updateAttemptCounter();
  }

  function showRetryFeedback(question, typed, options = {}) {
    session.lastCorrect = false;
    session.lastTyped = typed;
    session.draft = typed;
    const remaining = MAX_ATTEMPTS - session.questionAttempts;
    elements.feedbackPanel.className = "feedback show retry";
    $("#feedbackIcon").textContent = "!";
    $("#feedbackTitle").textContent = "有几个词需要再想想";
    renderAttemptReview(question, typed);
    $("#feedbackNote").textContent = `第 ${session.questionAttempts} 次未通过，还有 ${remaining} 次机会`;
    $("#nextQuestionButton").hidden = true;
    if (!options.silent) playFeedbackSound(false);
    if (!options.silent) animateFeedback(false);
    persistSession();
    markWrongAnswerSlots();
    if (options.focus !== false) {
      focusFirstOpenSlot();
    }
  }

  function renderAttemptReview(question, typed) {
    const review = buildAttemptReview(question, typed);
    $("#feedbackText").innerHTML = `<span class="feedback-label">检查一下：</span><span class="attempt-review">${review}</span>`;
  }

  function updateAttemptCounter() {
    if (!session) return;
    const used = Math.min(session.questionAttempts || 0, MAX_ATTEMPTS);
    if (session.answered) {
      $("#attemptCounter").textContent = session.lastCorrect
        ? `第 ${used} 次答对`
        : `${MAX_ATTEMPTS} 次已用完`;
      return;
    }
    $("#attemptCounter").textContent = `第 ${Math.min(used + 1, MAX_ATTEMPTS)} 次 / 共 ${MAX_ATTEMPTS} 次`;
  }

  function buildAttemptReview(question, typed) {
    const typedTokens = tokenizeReviewText(typed);
    const comparisons = acceptedAnswersFor(question).map((answer, index) => ({
      ...alignAnswerTokens(typedTokens, tokenizeReviewText(answer)),
      index
    })).sort((a, b) => a.distance - b.distance || a.index - b.index);
    const operations = comparisons[0]?.operations || typedTokens.map(token => ({ type: "wrong", token }));
    return operations.map(operation => {
      if (operation.type === "missing") {
        return `<span class="attempt-token missing" aria-label="缺少一个词">____</span>`;
      }
      const className = operation.type === "match" ? "attempt-token" : "attempt-token wrong";
      return `<span class="${className}">${escapeHtml(operation.token)}</span>`;
    }).join("");
  }

  function tokenizeReviewText(value) {
    return normalizeSurface(value).match(/[a-z]+|\d+(?:\.\d+)?|[\u4e00-\u9fff]+/g) || [];
  }

  function alignAnswerTokens(typedTokens, expectedTokens) {
    const typedLength = typedTokens.length;
    const expectedLength = expectedTokens.length;
    const costs = Array.from({ length: typedLength + 1 }, () => Array(expectedLength + 1).fill(0));
    for (let typedIndex = 0; typedIndex <= typedLength; typedIndex += 1) costs[typedIndex][0] = typedIndex;
    for (let expectedIndex = 0; expectedIndex <= expectedLength; expectedIndex += 1) costs[0][expectedIndex] = expectedIndex;
    for (let typedIndex = 1; typedIndex <= typedLength; typedIndex += 1) {
      for (let expectedIndex = 1; expectedIndex <= expectedLength; expectedIndex += 1) {
        const same = normalizeReviewToken(typedTokens[typedIndex - 1]) === normalizeReviewToken(expectedTokens[expectedIndex - 1]);
        costs[typedIndex][expectedIndex] = Math.min(
          costs[typedIndex - 1][expectedIndex - 1] + (same ? 0 : 1),
          costs[typedIndex - 1][expectedIndex] + 1,
          costs[typedIndex][expectedIndex - 1] + 1
        );
      }
    }

    const operations = [];
    let typedIndex = typedLength;
    let expectedIndex = expectedLength;
    while (typedIndex > 0 || expectedIndex > 0) {
      if (typedIndex > 0 && expectedIndex > 0) {
        const same = normalizeReviewToken(typedTokens[typedIndex - 1]) === normalizeReviewToken(expectedTokens[expectedIndex - 1]);
        const diagonalCost = costs[typedIndex - 1][expectedIndex - 1] + (same ? 0 : 1);
        if (costs[typedIndex][expectedIndex] === diagonalCost) {
          operations.push({ type: same ? "match" : "wrong", token: typedTokens[typedIndex - 1] });
          typedIndex -= 1;
          expectedIndex -= 1;
          continue;
        }
      }
      if (typedIndex > 0 && costs[typedIndex][expectedIndex] === costs[typedIndex - 1][expectedIndex] + 1) {
        operations.push({ type: "wrong", token: typedTokens[typedIndex - 1] });
        typedIndex -= 1;
        continue;
      }
      operations.push({ type: "missing", token: "" });
      expectedIndex -= 1;
    }
    operations.reverse();
    return { distance: costs[typedLength][expectedLength], operations };
  }

  function normalizeReviewToken(value) {
    return normalizeSurface(value);
  }

  function showFeedback(correct, question, typed, options = {}) {
    session.lastCorrect = correct;
    session.lastTyped = typed;
    session.draft = typed;
    const panel = elements.feedbackPanel;
    panel.className = `feedback show ${correct ? "correct" : "wrong"}`;
    $("#feedbackIcon").textContent = correct ? "✓" : "×";
    $("#feedbackTitle").textContent = correct ? "答对了" : "这题还差一点";
    const correctAnswers = question.answers.map(renderInteractiveEnglish).join(" / ");
    $("#feedbackText").innerHTML = correct
      ? `<span class="feedback-label">正确答案：</span>${correctAnswers}`
      : `<span class="feedback-label">你的答案：</span>${renderInteractiveEnglish(typed)}<br><span class="feedback-label">正确答案：</span>${correctAnswers}`;
    $("#feedbackNote").textContent = question.note || "";
    $("#nextQuestionButton").textContent = session.index === session.questions.length - 1 ? "查看结果 →" : "下一题 →";
    $("#nextQuestionButton").hidden = false;
    updatePrimaryPracticeAction();
    if (!options.silent) playFeedbackSound(correct);
    if (!options.silent) animateFeedback(correct);
    if (!options.silent && !correct && data.settings.autoReadQuestion && /[a-zA-Z]/.test(question.answers[0])) {
      setTimeout(() => speak(question.answers[0], "en-US"), 380);
    }
    if (options.focus !== false) $(".answer-submit").focus();
    persistSession();
  }

  function nextQuestion() {
    if (!session || !session.answered) return;
    if (session.index < session.questions.length - 1) {
      session.index += 1;
      session.answered = false;
      session.draft = "";
      session.lastTyped = "";
      session.lastCorrect = null;
      session.hintRevealed = false;
      session.questionAttempts = 0;
      persistSession();
      renderPracticeQuestion();
    } else {
      showResult();
    }
  }

  function showResult() {
    const total = session.questions.length;
    const score = Math.round(session.correct / total * 100);
    $("#resultScore").textContent = `${score}%`;
    $("#resultCorrect").textContent = session.correct;
    $("#resultWrong").textContent = session.wrong.length;
    $("#resultTotal").textContent = total;
    $("#resultTitle").textContent = score === 100 ? "全部拿下，这轮很稳" : score >= 80 ? "已经很不错，再收个尾" : "已经找到该重点练的地方";
    $("#resultText").textContent = session.wrong.length ? `本轮有 ${session.wrong.length} 道错题，现在趁热再做一次最有效。` : "本轮没有留下错题，可以换一组内容继续。";
    $("#retryWrongButton").style.display = session.wrong.length ? "inline-block" : "none";
    $("#practiceProgressBar").style.width = "100%";
    session.completed = true;
    localStorage.removeItem(SESSION_STORAGE_KEY);
    renderResultCelebration(score);
    switchView("result");
    renderAll();
  }

  function retrySessionWrong() {
    if (session && session.wrong.length) startPractice("retry", null, session.wrong);
  }

  function loadSession() {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY));
      if (!saved || saved.completed || !Array.isArray(saved.questionIds)) return null;
      const catalog = new Map(allQuestions().map(question => [question.id, question]));
      const questions = saved.questionIds.map(id => catalog.get(id)).filter(Boolean);
      if (!questions.length) return null;
      const wrong = (saved.wrongIds || []).map(id => catalog.get(id)).filter(Boolean);
      return {
        mode: saved.mode || "all",
        setId: saved.setId || null,
        questions,
        index: Math.min(Math.max(Number(saved.index) || 0, 0), questions.length - 1),
        correct: Number(saved.correct) || 0,
        wrong,
        answered: Boolean(saved.answered),
        draft: saved.draft || "",
        lastTyped: saved.lastTyped || "",
        lastCorrect: typeof saved.lastCorrect === "boolean" ? saved.lastCorrect : null,
        hintRevealed: Boolean(saved.hintRevealed),
        questionAttempts: Math.min(Math.max(Number(saved.questionAttempts) || (saved.answered ? 1 : 0), 0), MAX_ATTEMPTS),
        startedAt: saved.startedAt || Date.now(),
        completed: false
      };
    } catch (error) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }

  function persistSession() {
    if (!session || session.completed) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      mode: session.mode,
      setId: session.setId,
      questionIds: session.questions.map(question => question.id),
      index: session.index,
      correct: session.correct,
      wrongIds: session.wrong.map(question => question.id),
      answered: session.answered,
      draft: session.draft || "",
      lastTyped: session.lastTyped || "",
      lastCorrect: session.lastCorrect,
      hintRevealed: session.hintRevealed,
      questionAttempts: session.questionAttempts || 0,
      startedAt: session.startedAt
    }));
  }

  function clearSession() {
    session = null;
    localStorage.removeItem(SESSION_STORAGE_KEY);
    renderResumeState();
  }

  async function revealKeywordHint(options = {}) {
    if (!session || currentView !== "practice") return;
    if (session.answered && !options.restored) return;
    const question = session.questions[session.index];
    if (!question) return;
    session.hintRevealed = true;
    persistSession();
    $("#hintButton").setAttribute("aria-pressed", "true");
    const hint = resolveQuestionHint(question);
    renderKeywordHint(hint);
    if (hint.phonetic) return;

    const lookup = normalizeLookupWord(hint.word);
    const localData = resolveLocalWordDetails(hint.word);
    if (localData.us.ipa) {
      updateKeywordHintPhonetic(question.id, hint.word, localData.us.ipa);
      return;
    }
    try {
      const result = await lookupPhonetics(lookup);
      updateKeywordHintPhonetic(question.id, hint.word, result.us.ipa);
    } catch (error) {
      updateKeywordHintPhonetic(question.id, hint.word, "点击词语可直接播放发音");
    }
  }

  function resolveQuestionHint(question) {
    const nextAnswerHint = resolveNextAnswerHint(question, syncAnswerFromSlots());
    if (nextAnswerHint) return nextAnswerHint;
    if (question.hint?.word) return { ...question.hint };
    const stopWords = new Set(["about", "after", "again", "also", "and", "are", "can", "could", "do", "does", "for", "from", "have", "here", "how", "i", "in", "is", "it", "me", "my", "of", "our", "please", "should", "the", "this", "to", "we", "what", "where", "which", "with", "you", "your"]);
    const source = [...acceptedAnswersFor(question), question.prompt].join(" ");
    const candidates = source.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || [];
    const word = candidates
      .map(candidate => candidate.replace(/’/g, "'"))
      .filter(candidate => !stopWords.has(candidate.toLowerCase()))
      .sort((a, b) => b.length - a.length)[0] || candidates[0] || "word";
    return { word, meaning: "关键词提示", phonetic: "" };
  }

  function resolveNextAnswerHint(question, draft) {
    const englishAnswers = acceptedAnswersFor(question).filter(answer => /[A-Za-z]/.test(answer));
    if (!englishAnswers.length) return null;
    const candidates = englishAnswers.map((answer, index) => ({
      ...evaluateAnswerProgress(answer, draft),
      index
    })).sort((a, b) => b.score - a.score || a.index - b.index);
    const best = candidates[0];
    if (!best || !best.words.length) return null;
    if (best.complete) {
      return { word: "Ready", meaning: "句子已经写完，可以提交", phonetic: "/ˈredi/" };
    }
    return clueForWord(best.words[best.targetIndex]);
  }

  function evaluateAnswerProgress(answer, draft) {
    const words = tokenizeEnglish(answer);
    const typedWords = tokenizeEnglish(draft);
    if (!typedWords.length) return { words, targetIndex: 0, score: 0, complete: false };
    let score = 0;
    let targetIndex = 0;
    for (let index = 0; index < typedWords.length; index += 1) {
      if (index >= words.length) {
        return { words, targetIndex: words.length - 1, score: score - 120, complete: false };
      }
      const typed = normalizeHintToken(typedWords[index]);
      const expected = normalizeHintToken(words[index]);
      if (typed === expected) {
        score += 100;
        targetIndex = index + 1;
        continue;
      }
      const isCurrentWord = index === typedWords.length - 1;
      if (isCurrentWord && expected.startsWith(typed)) {
        score += 55 + Math.round(typed.length / expected.length * 35);
      } else {
        score -= Math.min(90, levenshtein(typed, expected) * 12);
      }
      return { words, targetIndex: index, score, complete: false };
    }
    return {
      words,
      targetIndex: Math.min(targetIndex, words.length - 1),
      score,
      complete: targetIndex >= words.length
    };
  }

  function tokenizeEnglish(value) {
    return normalizeSurface(value).match(/[a-z]+/g) || [];
  }

  function normalizeHintToken(value) {
    return normalizeSurface(value);
  }

  function clueForWord(word) {
    const directKey = normalizeHintToken(word);
    const lookup = normalizeLookupWord(word);
    const clue = WORD_CLUES[directKey] || WORD_CLUES[lookup];
    const localData = resolveLocalWordDetails(word);
    const phonetic = clue?.phonetic || localData.us.ipa || "";
    return {
      word,
      meaning: clue?.meaning || localData.meaning || "下一个要写的词",
      phonetic
    };
  }

  function renderKeywordHint(hint) {
    const panel = $("#keywordHint");
    panel.hidden = false;
    panel.classList.remove("visible");
    void panel.offsetWidth;
    panel.classList.add("visible");
    $("#keywordHintWord").textContent = hint.word;
    $("#keywordHintWord").dataset.word = hint.word;
    $("#keywordHintMeaning").textContent = hint.meaning || "关键词提示";
    $("#keywordHintPhonetic").textContent = hint.phonetic || "正在查询音标…";
  }

  function updateKeywordHintPhonetic(questionId, word, phonetic) {
    if (!session || session.questions[session.index]?.id !== questionId || !session.hintRevealed) return;
    if (normalizeHintToken($("#keywordHintWord").dataset.word) !== normalizeHintToken(word)) return;
    $("#keywordHintPhonetic").textContent = phonetic;
  }

  function hideKeywordHint() {
    const panel = $("#keywordHint");
    panel.hidden = true;
    panel.classList.remove("visible");
    $("#hintButton").setAttribute("aria-pressed", "false");
  }

  function acceptedAnswersFor(question) {
    const answers = Array.isArray(question?.answers) ? question.answers.filter(Boolean) : [];
    const builtIn = BUILT_IN_ANSWER_VARIANTS[question?.id];
    if (!builtIn || !answers.some(answer => normalizeSurface(answer) === normalizeSurface(builtIn.anchor))) {
      return answers;
    }
    return [...new Set([...answers, ...builtIn.variants])];
  }

  function isAccepted(input, answer) {
    const a = normalize(input);
    const b = normalize(answer);
    return a === b;
  }

  function normalize(value) {
    let text = normalizeSurface(value);
    SEMANTIC_PHRASE_GROUPS.forEach((group, index) => {
      const marker = " intentphrase" + index + " ";
      group
        .map(phrase => normalizeSurface(phrase))
        .sort((a, b) => b.length - a.length)
        .forEach(phrase => {
          const phrasePattern = escapeRegExp(phrase).replace(/\\ /g, "\\s+");
          const pattern = new RegExp("(^|\\s)" + phrasePattern + "(?=\\s|$)", "g");
          text = text.replace(pattern, "$1" + marker);
        });
    });
    return text
      .split(" ")
      .filter(Boolean)
      .map(word => SEMANTIC_WORD_EQUIVALENTS[word] || word)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeSurface(value) {
    let text = String(value)
      .toLowerCase()
      .trim()
      .replace(/[’‘\u0060´]/g, "'");
    CONTRACTION_RULES.forEach(([pattern, replacement]) => {
      text = text.replace(pattern, replacement);
    });
    return text
      .replace(/&/g, " and ")
      .replace(/['"]/g, "")
      .replace(/[.,!?;:“”。；，！？：()\[\]{}\-_\/\\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
  }

  function levenshtein(a, b) {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
    return matrix[b.length][a.length];
  }

  function playNextEnglishVoice() {
    const gender = nextEnglishVoiceGender;
    if (!speakCurrentEnglish(0.92, gender)) return;
    lastEnglishVoiceGender = gender;
    nextEnglishVoiceGender = gender === "male" ? "female" : "male";
    renderVoiceCycleButton();
  }

  function renderVoiceCycleButton() {
    const maleNext = nextEnglishVoiceGender === "male";
    $("#voiceCycleIcon").textContent = maleNext ? "♂" : "♀";
    $("#voiceCycleLabel").textContent = maleNext ? "自然男声" : "自然女声";
    $("#speakPromptButton").title = maleNext ? "播放自然英文男声" : "播放自然英文女声";
    $("#speakPromptButton").setAttribute("aria-label", $("#speakPromptButton").title);
  }

  function speakCurrentEnglish(rate = 0.92, voiceGender) {
    if (!session) return false;
    return speakQuestionEnglish(session.questions[session.index], rate, voiceGender);
  }

  function speakQuestionEnglish(question, rate = 0.92, voiceGender) {
    const englishAnswer = question.answers?.find(answer => /[A-Za-z]/.test(answer));
    const text = englishAnswer || (/[A-Za-z]/.test(question.prompt) ? question.prompt : "");
    if (!text) {
      showToast("这道题暂时没有可播放的英文");
      return false;
    }
    return speak(text, "en-US", rate, voiceGender);
  }

  function prepareSpeechVoices() {
    if (!("speechSynthesis" in window)) return;
    const refreshVoices = () => {
      const voices = window.speechSynthesis.getVoices?.() || [];
      if (voices.length) cachedSpeechVoices = voices;
    };
    refreshVoices();
    if (typeof window.speechSynthesis.addEventListener === "function") {
      window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    } else {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
    [60, 180, 420].forEach(delay => setTimeout(refreshVoices, delay));
  }

  function wakeSpeechEngine() {
    if ("speechSynthesis" in window) {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume?.();
      if (!cachedSpeechVoices.length) {
        const voices = window.speechSynthesis.getVoices?.() || [];
        if (voices.length) cachedSpeechVoices = voices;
      }
    }
    if (audioContext?.state === "suspended") audioContext.resume().catch(() => {});
  }

  function speak(text, preferredLang, rate = 0.92, voiceGender) {
    if (!("speechSynthesis" in window)) {
      showToast("当前浏览器不支持朗读");
      return false;
    }
    wakeSpeechEngine();
    const synth = window.speechSynthesis;
    const requestId = ++speechRequestId;
    clearTimeout(speechStartTimer);
    const wasBusy = synth.speaking || synth.pending || synth.paused;
    if (wasBusy) synth.cancel();
    const voices = cachedSpeechVoices.length ? cachedSpeechVoices : (synth.getVoices?.() || []);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = preferredLang || (/[\u4e00-\u9fff]/.test(text) ? "zh-CN" : "en-US");
    utterance.rate = rate;
    utterance.pitch = 1.02;
    utterance.volume = 0.98;
    utterance.voice = selectSpeechVoice(voices, utterance.lang, voiceGender);
    const startSpeaking = () => {
      if (requestId !== speechRequestId) return;
      synth.resume?.();
      synth.speak(utterance);
    };
    if (wasBusy) speechStartTimer = setTimeout(startSpeaking, 18);
    else startSpeaking();
    return true;
  }

  function selectSpeechVoice(voices, language, voiceGender) {
    const languageCode = language.toLowerCase();
    const languageVoices = voices.filter(voice => {
      const voiceLanguage = (voice.lang || "").toLowerCase();
      return voiceLanguage === languageCode || voiceLanguage.startsWith(languageCode.slice(0, 2));
    });
    if (!languageVoices.length) return null;
    return [...languageVoices].sort((left, right) => (
      voiceQualityScore(right, languageCode, voiceGender) - voiceQualityScore(left, languageCode, voiceGender)
    ))[0];
  }

  function voiceQualityScore(voice, languageCode, voiceGender) {
    const name = (voice.name || "").toLowerCase();
    const voiceLanguage = (voice.lang || "").toLowerCase();
    let score = voiceLanguage === languageCode ? 45 : 20;
    NATURAL_VOICE_HINTS.forEach((hint, index) => {
      if (name.includes(hint)) score += 120 - index * 10;
    });
    if (/microsoft|google|apple/.test(name)) score += 18;
    if (voice.localService === false) score += 10;
    if (voiceGender && languageCode.startsWith("en")) {
      const genderIndex = (VOICE_NAME_HINTS[voiceGender] || []).findIndex(hint => name.includes(hint));
      if (genderIndex >= 0) score += 75 - Math.min(genderIndex, 12) * 3;
    }
    return score;
  }

  async function openWordCoach(word) {
    const lookup = normalizeLookupWord(word);
    if (!lookup) return;
    const localData = resolveLocalWordDetails(word);
    activeWord = { display: word, lookup, data: localData };
    preloadPronunciationAudio(localData);
    $("#wordCoachTitle").textContent = word;
    renderWordCoachData(localData, "已显示本机词义和词性，正在后台补充联网发音…");
    openModal("wordCoach");

    try {
      const result = await lookupPhonetics(lookup);
      if (!activeWord || activeWord.lookup !== lookup) return;
      const merged = mergeWordCoachData(localData, result);
      activeWord.data = merged;
      preloadPronunciationAudio(merged);
      renderWordCoachData(merged, "中文和词性来自本机词库；发音资料已联网补充。");
    } catch (error) {
      if (!activeWord || activeWord.lookup !== lookup) return;
      $("#wordCoachStatus").textContent = "当前未连接到在线词典，中文、词性和本机音标仍可使用；点击按钮可直接朗读。";
    }
  }

  async function lookupPhonetics(word) {
    const cached = phoneticCache[word];
    const cacheIsUsable = cached
      && !/暂不可用|unavailable/i.test(`${cached.us?.ipa || ""} ${cached.uk?.ipa || ""}`)
      && Date.now() - cached.cachedAt < 90 * 24 * 60 * 60 * 1000;
    if (cacheIsUsable) return cached;
    if (cached) delete phoneticCache[word];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch(`${DICTIONARY_ENDPOINT}${encodeURIComponent(word)}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Word not found");
      const entries = await response.json();
      const result = parseDictionaryEntries(entries, word);
      result.cachedAt = Date.now();
      phoneticCache[word] = result;
      savePhoneticCache();
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }

  function parseDictionaryEntries(entries, word) {
    const safeEntries = Array.isArray(entries) ? entries : [];
    const phonetics = safeEntries.flatMap(entry => entry.phonetics || []).filter(item => item.text || item.audio);
    const generic = safeEntries.find(entry => entry.phonetic)?.phonetic || phonetics.find(item => item.text)?.text || "";
    const usItem = phonetics.find(item => /(^|[-_/])us([-.]|$)/i.test(item.audio || "")) || phonetics.find(item => /oʊ|ɝ|ɚ/.test(item.text || ""));
    const ukItem = phonetics.find(item => /(^|[-_/])uk([-.]|$)/i.test(item.audio || "")) || phonetics.find(item => /əʊ|ɒ|ɜː/.test(item.text || ""));
    const firstAudio = phonetics.find(item => item.audio);
    const normalizeAudio = value => value && value.startsWith("//") ? `https:${value}` : (value || "");
    const partsOfSpeech = [...new Set(safeEntries.flatMap(entry => (
      entry.meanings || []
    )).map(meaning => translatePartOfSpeech(meaning.partOfSpeech)).filter(Boolean))];
    const cleanIpa = value => value || generic || "";
    return {
      word,
      us: { ipa: cleanIpa(usItem?.text), audio: normalizeAudio(usItem?.audio || firstAudio?.audio) },
      uk: { ipa: cleanIpa(ukItem?.text), audio: normalizeAudio(ukItem?.audio || firstAudio?.audio) },
      partOfSpeech: partsOfSpeech.join(" / "),
      source: "dictionary"
    };
  }

  function translatePartOfSpeech(value) {
    const map = {
      noun: "名词", verb: "动词", adjective: "形容词", adverb: "副词", pronoun: "代词",
      preposition: "介词", conjunction: "连词", interjection: "感叹词", determiner: "限定词",
      article: "冠词", auxiliary: "助动词"
    };
    return map[String(value || "").toLowerCase()] || "";
  }

  function mergeWordCoachData(localData, onlineData) {
    return {
      ...localData,
      us: {
        ipa: onlineData.us?.ipa || localData.us?.ipa || "",
        audio: onlineData.us?.audio || localData.us?.audio || ""
      },
      uk: {
        ipa: onlineData.uk?.ipa || localData.uk?.ipa || "",
        audio: onlineData.uk?.audio || localData.uk?.audio || ""
      },
      meaning: localData.meaning,
      partOfSpeech: localData.partOfSpeech || onlineData.partOfSpeech || "常用词",
      source: onlineData.source || localData.source
    };
  }

  function renderWordCoachData(result, status) {
    const usIpa = result.us?.ipa || "可直接播放发音";
    const ukIpa = result.uk?.ipa || usIpa;
    const unique = usIpa === ukIpa;
    $("#wordCoachPhonetics").innerHTML = unique
      ? `<strong class="phonetic-main">${escapeHtml(usIpa)}</strong><span>通用音标</span>`
      : `<div><span>US</span><strong>${escapeHtml(usIpa)}</strong></div><div><span>UK</span><strong>${escapeHtml(ukIpa)}</strong></div>`;
    $("#wordCoachMeaning").textContent = result.meaning || "结合当前句子理解";
    $("#wordCoachPartOfSpeech").textContent = result.partOfSpeech || "常用词";
    $("#usPhonetic").textContent = usIpa;
    $("#ukPhonetic").textContent = ukIpa;
    $("#wordCoachStatus").textContent = status;
  }

  function playPronunciation(accent) {
    if (!activeWord) return;
    const pronunciation = activeWord.data?.[accent];
    const language = accent === "uk" ? "en-GB" : "en-US";
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }
    if (pronunciation?.audio) {
      window.speechSynthesis?.cancel();
      activeAudio = getPronunciationAudio(pronunciation.audio);
      activeAudio.currentTime = 0;
      activeAudio.play().catch(() => speak(activeWord.display, language));
      return;
    }
    speak(activeWord.display, language);
  }

  function preloadPronunciationAudio(result) {
    [result?.us?.audio, result?.uk?.audio].filter(Boolean).forEach(getPronunciationAudio);
  }

  function getPronunciationAudio(url) {
    if (!url) return null;
    if (!pronunciationAudioCache.has(url)) {
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.load();
      pronunciationAudioCache.set(url, audio);
    }
    return pronunciationAudioCache.get(url);
  }

  function normalizeLookupWord(word) {
    const candidates = lookupWordCandidates(word);
    return candidates.find(candidate => (
      LOCAL_WORD_DETAILS[candidate]
      || WORD_COACH_SUPPLEMENTS[candidate]
      || WORD_CLUES[candidate]
      || BUILT_IN_PHONETICS[candidate]
      || findQuestionHint(candidate)
    )) || candidates[0] || "";
  }

  function lookupWordCandidates(word) {
    const cleaned = String(word).toLowerCase().replace(/’/g, "'").replace(/^[^a-z]+|[^a-z'-]+$/g, "");
    if (!cleaned) return [];
    const contractions = {
      "what's": "what", "who's": "who", "where's": "where", "when's": "when", "it's": "it",
      "i'm": "i", "you're": "you", "we're": "we", "they're": "they", "can't": "can",
      "don't": "do", "doesn't": "does", "won't": "will", "i'll": "i", "we'll": "we"
    };
    const candidates = [cleaned, contractions[cleaned]];
    if (cleaned.endsWith("'s")) candidates.push(cleaned.slice(0, -2));
    if (cleaned.endsWith("ies") && cleaned.length > 4) candidates.push(`${cleaned.slice(0, -3)}y`);
    if (cleaned.endsWith("es") && cleaned.length > 4) candidates.push(cleaned.slice(0, -2));
    if (cleaned.endsWith("s") && !cleaned.endsWith("ss") && cleaned.length > 3) candidates.push(cleaned.slice(0, -1));
    if (cleaned.endsWith("ing") && cleaned.length > 5) {
      const base = cleaned.slice(0, -3);
      candidates.push(base, `${base}e`);
      if (base.length > 2 && base.at(-1) === base.at(-2)) candidates.push(base.slice(0, -1));
    }
    if (cleaned.endsWith("ied") && cleaned.length > 4) candidates.push(`${cleaned.slice(0, -3)}y`);
    if (cleaned.endsWith("ed") && cleaned.length > 4) {
      const base = cleaned.slice(0, -2);
      candidates.push(base, `${base}e`);
      if (base.length > 2 && base.at(-1) === base.at(-2)) candidates.push(base.slice(0, -1));
    }
    return [...new Set(candidates.filter(Boolean))];
  }

  function findQuestionHint(word) {
    for (const set of data.sets || []) {
      for (const question of set.questions || []) {
        if (!question.hint?.word) continue;
        if (lookupWordCandidates(question.hint.word).includes(word)) return question.hint;
      }
    }
    return null;
  }

  function inferPartOfSpeech(word) {
    if (GRAMMAR_WORDS.pronouns.has(word)) return "代词";
    if (GRAMMAR_WORDS.articles.has(word)) return "冠词";
    if (GRAMMAR_WORDS.modals.has(word)) return "情态动词";
    if (GRAMMAR_WORDS.auxiliaries.has(word)) return "助动词";
    if (GRAMMAR_WORDS.questionWords.has(word)) return "疑问词";
    if (GRAMMAR_WORDS.conjunctions.has(word)) return "连词";
    if (GRAMMAR_WORDS.prepositions.has(word)) return "介词";
    if (GRAMMAR_WORDS.commonVerbs.has(word)) return "动词";
    if (GRAMMAR_WORDS.commonAdjectives.has(word)) return "形容词";
    if (/ly$/.test(word)) return "副词";
    if (/(tion|ment|ness|ity|er|or)$/.test(word)) return "名词";
    if (/(able|ible|ive|ous|ful|less|al)$/.test(word)) return "形容词";
    if (/(ing|ed)$/.test(word)) return "动词 / 形容词";
    return "名词 / 动词（依语境）";
  }

  function resolveLocalWordDetails(word) {
    const candidates = lookupWordCandidates(word);
    const original = candidates[0] || "";
    const lookup = normalizeLookupWord(word);
    const local = {
      ...(WORD_COACH_SUPPLEMENTS[lookup] || {}),
      ...(LOCAL_WORD_DETAILS[lookup] || {})
    };
    const clue = WORD_CLUES[lookup] || WORD_CLUES[original] || {};
    const questionHint = findQuestionHint(lookup) || {};
    const builtIn = BUILT_IN_PHONETICS[lookup] || {};
    const phonetic = local.phonetic || clue.phonetic || questionHint.phonetic || builtIn.us || builtIn.uk || "";
    const plural = original !== lookup && /s$/.test(original) && !/'s$/.test(original);
    const basePartOfSpeech = local.partOfSpeech || inferPartOfSpeech(lookup);
    return {
      word: lookup,
      display: word,
      meaning: local.meaning || clue.meaning || questionHint.meaning || `“${word}”在当前句中的含义`,
      partOfSpeech: plural && basePartOfSpeech.includes("名词")
        ? `${basePartOfSpeech}（复数）`
        : basePartOfSpeech,
      us: { ipa: builtIn.us || phonetic, audio: "" },
      uk: { ipa: builtIn.uk || phonetic, audio: "" },
      source: "local"
    };
  }

  function loadPhoneticCache() {
    try {
      return JSON.parse(localStorage.getItem(PHONETIC_CACHE_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function savePhoneticCache() {
    const newest = Object.entries(phoneticCache)
      .sort((a, b) => (b[1].cachedAt || 0) - (a[1].cachedAt || 0))
      .slice(0, 300);
    phoneticCache = Object.fromEntries(newest);
    localStorage.setItem(PHONETIC_CACHE_KEY, JSON.stringify(phoneticCache));
  }

  function playFeedbackSound(correct, preview) {
    if (!data.settings.soundEffects && !preview) return;
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return;
    audioContext = audioContext || new AudioEngine();
    if (audioContext.state === "suspended") audioContext.resume();
    const start = audioContext.currentTime + 0.01;
    const notes = correct
      ? [{ hz: 523.25, at: 0, duration: 0.16 }, { hz: 659.25, at: 0.08, duration: 0.18 }, { hz: 783.99, at: 0.16, duration: 0.24 }]
      : [{ hz: 246.94, at: 0, duration: 0.18 }, { hz: 196, at: 0.13, duration: 0.25 }];
    notes.forEach(note => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = correct ? "sine" : "triangle";
      oscillator.frequency.value = note.hz;
      gain.gain.setValueAtTime(0.0001, start + note.at);
      gain.gain.exponentialRampToValueAtTime(preview ? 0.035 : 0.055, start + note.at + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start + note.at);
      oscillator.stop(start + note.at + note.duration + 0.02);
    });
  }

  function animateFeedback(correct) {
    const stage = $("#questionStage");
    stage.classList.remove("is-correct", "is-wrong");
    void stage.offsetWidth;
    stage.classList.add(correct ? "is-correct" : "is-wrong");
    if (!correct || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const burst = $("#feedbackBurst");
    burst.replaceChildren();
    const colors = ["#f2c75c", "#df7156", "#4ca58a", "#60a9bd", "#f4eee3"];
    for (let index = 0; index < 14; index++) {
      const piece = document.createElement("i");
      piece.style.setProperty("--x", `${(index - 6.5) * 15}px`);
      piece.style.setProperty("--y", `${-48 - (index % 4) * 20}px`);
      piece.style.setProperty("--r", `${index * 37}deg`);
      piece.style.setProperty("--c", colors[index % colors.length]);
      piece.style.setProperty("--d", `${(index % 5) * 26}ms`);
      burst.appendChild(piece);
    }
  }

  function renderResultCelebration(score) {
    const panel = $("#resultPanel");
    const layer = $("#resultConfetti");
    panel.classList.toggle("celebrate", score >= 80);
    layer.replaceChildren();
    if (score < 80 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#f2c75c", "#df7156", "#4ca58a", "#60a9bd"];
    for (let index = 0; index < 22; index++) {
      const piece = document.createElement("i");
      piece.style.left = `${4 + (index * 43) % 92}%`;
      piece.style.setProperty("--delay", `${(index % 7) * 80}ms`);
      piece.style.setProperty("--drift", `${(index % 2 ? 1 : -1) * (15 + index % 5 * 8)}px`);
      piece.style.background = colors[index % colors.length];
      layer.appendChild(piece);
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `echo-english-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("题库备份已导出");
  }

  function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported.sets)) throw new Error("Invalid backup");
        if (!window.confirm("导入会替换当前题库和练习记录，确定继续吗？")) return;
        data = migrateData(imported);
        clearSession();
        selectedSetId = "all";
        saveData();
        renderAll();
        showToast("题库备份已恢复");
      } catch (error) {
        showToast("这不是有效的 Echo English 备份文件");
      } finally {
        elements.importFileInput.value = "";
      }
    };
    reader.readAsText(file);
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function setMobileMenu(open) {
    $("#sidebar").classList.toggle("open", open);
    $("#sidebarScrim").classList.toggle("open", open);
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    if (id === "wordCoach") {
      window.speechSynthesis?.cancel();
      if (activeAudio) activeAudio.pause();
      activeAudio = null;
      activeWord = null;
    }
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2400);
  }

  function emptyState(title, text, actionText, action) {
    return `<div class="empty-state"><strong>${title}</strong><span>${text}</span>${actionText ? `<br><button class="button secondary" data-empty-action="${action}">${actionText}</button>` : ""}</div>`;
  }

  function bindEmptyActions() {
    $$('[data-empty-action="new-set"]').forEach(button => button.addEventListener("click", () => openSetModal()));
    $$('[data-empty-action="add-questions"]').forEach(button => button.addEventListener("click", () => openQuestionModal()));
    $$('[data-empty-action="practice-all"]').forEach(button => button.addEventListener("click", () => startPractice("all")));
  }

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function todayKey() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }

  function renderInteractiveEnglish(value) {
    return String(value).split(/([A-Za-z]+(?:[’'][A-Za-z]+)*(?:-[A-Za-z]+)*)/g).map(part => {
      if (!/^[A-Za-z]+(?:[’'][A-Za-z]+)*(?:-[A-Za-z]+)*$/.test(part)) return escapeHtml(part);
      const safe = escapeHtml(part);
      return `<button type="button" class="word-token" data-word="${safe}" title="听读 ${safe}">${safe}</button>`;
    }).join("");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }
})();
