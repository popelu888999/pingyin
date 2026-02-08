// 《拼音大冒险》— 生字数据（人教版一年级上册）
// 15组练习数据，每组约20字

const HANZI_GROUPS = [
  {
    id: 1,
    name: '第1组',
    desc: '最基础，多为单韵母',
    chars: [
      { hanzi: '天', pinyin: 'tiān', input: 'tian' },
      { hanzi: '地', pinyin: 'dì', input: 'di' },
      { hanzi: '人', pinyin: 'rén', input: 'ren' },
      { hanzi: '你', pinyin: 'nǐ', input: 'ni' },
      { hanzi: '我', pinyin: 'wǒ', input: 'wo' },
      { hanzi: '他', pinyin: 'tā', input: 'ta' },
      { hanzi: '金', pinyin: 'jīn', input: 'jin' },
      { hanzi: '木', pinyin: 'mù', input: 'mu' },
      { hanzi: '水', pinyin: 'shuǐ', input: 'shui' },
      { hanzi: '火', pinyin: 'huǒ', input: 'huo' },
      { hanzi: '土', pinyin: 'tǔ', input: 'tu' },
      { hanzi: '口', pinyin: 'kǒu', input: 'kou' },
      { hanzi: '耳', pinyin: 'ěr', input: 'er' },
      { hanzi: '目', pinyin: 'mù', input: 'mu' },
      { hanzi: '手', pinyin: 'shǒu', input: 'shou' },
      { hanzi: '足', pinyin: 'zú', input: 'zu' },
      { hanzi: '站', pinyin: 'zhàn', input: 'zhan' },
      { hanzi: '坐', pinyin: 'zuò', input: 'zuo' },
      { hanzi: '日', pinyin: 'rì', input: 'ri' },
      { hanzi: '月', pinyin: 'yuè', input: 'yue' }
    ]
  },
  {
    id: 2,
    name: '第2组',
    desc: '开始出现双拼音节',
    chars: [
      { hanzi: '山', pinyin: 'shān', input: 'shan' },
      { hanzi: '对', pinyin: 'duì', input: 'dui' },
      { hanzi: '云', pinyin: 'yún', input: 'yun' },
      { hanzi: '雨', pinyin: 'yǔ', input: 'yu' },
      { hanzi: '风', pinyin: 'fēng', input: 'feng' },
      { hanzi: '花', pinyin: 'huā', input: 'hua' },
      { hanzi: '鸟', pinyin: 'niǎo', input: 'niao' },
      { hanzi: '虫', pinyin: 'chóng', input: 'chong' },
      { hanzi: '爸', pinyin: 'bà', input: 'ba' },
      { hanzi: '妈', pinyin: 'mā', input: 'ma' },
      { hanzi: '马', pinyin: 'mǎ', input: 'ma' },
      { hanzi: '不', pinyin: 'bù', input: 'bu' },
      { hanzi: '画', pinyin: 'huà', input: 'hua' },
      { hanzi: '迹', pinyin: 'jì', input: 'ji' },
      { hanzi: '打', pinyin: 'dǎ', input: 'da' },
      { hanzi: '棋', pinyin: 'qí', input: 'qi' },
      { hanzi: '鸡', pinyin: 'jī', input: 'ji' },
      { hanzi: '叠', pinyin: 'dié', input: 'die' },
      { hanzi: '字', pinyin: 'zì', input: 'zi' }
    ]
  },
  {
    id: 3,
    name: '第3组',
    desc: '"了"是多音字(le)',
    chars: [
      { hanzi: '过', pinyin: 'guò', input: 'guo' },
      { hanzi: '路', pinyin: 'lù', input: 'lu' },
      { hanzi: '秋', pinyin: 'qiū', input: 'qiu' },
      { hanzi: '气', pinyin: 'qì', input: 'qi' },
      { hanzi: '了', pinyin: 'le', input: 'le' },
      { hanzi: '树', pinyin: 'shù', input: 'shu' },
      { hanzi: '叶', pinyin: 'yè', input: 'ye' },
      { hanzi: '片', pinyin: 'piàn', input: 'pian' },
      { hanzi: '大', pinyin: 'dà', input: 'da' },
      { hanzi: '飞', pinyin: 'fēi', input: 'fei' },
      { hanzi: '会', pinyin: 'huì', input: 'hui' },
      { hanzi: '个', pinyin: 'gè', input: 'ge' },
      { hanzi: '的', pinyin: 'de', input: 'de' },
      { hanzi: '船', pinyin: 'chuán', input: 'chuan' },
      { hanzi: '小', pinyin: 'xiǎo', input: 'xiao' },
      { hanzi: '尖', pinyin: 'jiān', input: 'jian' },
      { hanzi: '桥', pinyin: 'qiáo', input: 'qiao' },
      { hanzi: '台', pinyin: 'tái', input: 'tai' },
      { hanzi: '雪', pinyin: 'xuě', input: 'xue' }
    ]
  },
  {
    id: 4,
    name: '第4组',
    desc: '注意"两"的三拼(liang)',
    chars: [
      { hanzi: '两', pinyin: 'liǎng', input: 'liang' },
      { hanzi: '头', pinyin: 'tóu', input: 'tou' },
      { hanzi: '在', pinyin: 'zài', input: 'zai' },
      { hanzi: '里', pinyin: 'lǐ', input: 'li' },
      { hanzi: '看', pinyin: 'kàn', input: 'kan' },
      { hanzi: '见', pinyin: 'jiàn', input: 'jian' },
      { hanzi: '闪', pinyin: 'shǎn', input: 'shan' },
      { hanzi: '星', pinyin: 'xīng', input: 'xing' },
      { hanzi: '蓝', pinyin: 'lán', input: 'lan' },
      { hanzi: '江', pinyin: 'jiāng', input: 'jiang' },
      { hanzi: '南', pinyin: 'nán', input: 'nan' },
      { hanzi: '可', pinyin: 'kě', input: 'ke' },
      { hanzi: '采', pinyin: 'cǎi', input: 'cai' },
      { hanzi: '莲', pinyin: 'lián', input: 'lian' },
      { hanzi: '鱼', pinyin: 'yú', input: 'yu' },
      { hanzi: '东', pinyin: 'dōng', input: 'dong' },
      { hanzi: '西', pinyin: 'xī', input: 'xi' },
      { hanzi: '北', pinyin: 'běi', input: 'bei' }
    ]
  },
  {
    id: 5,
    name: '第5组',
    desc: '区分前鼻音(jin)后鼻音(ting)',
    chars: [
      { hanzi: '说', pinyin: 'shuō', input: 'shuo' },
      { hanzi: '春', pinyin: 'chūn', input: 'chun' },
      { hanzi: '青', pinyin: 'qīng', input: 'qing' },
      { hanzi: '蛙', pinyin: 'wā', input: 'wa' },
      { hanzi: '夏', pinyin: 'xià', input: 'xia' },
      { hanzi: '弯', pinyin: 'wān', input: 'wan' },
      { hanzi: '就', pinyin: 'jiù', input: 'jiu' },
      { hanzi: '冬', pinyin: 'dōng', input: 'dong' },
      { hanzi: '远', pinyin: 'yuǎn', input: 'yuan' },
      { hanzi: '有', pinyin: 'yǒu', input: 'you' },
      { hanzi: '色', pinyin: 'sè', input: 'se' },
      { hanzi: '近', pinyin: 'jìn', input: 'jin' },
      { hanzi: '听', pinyin: 'tīng', input: 'ting' },
      { hanzi: '无', pinyin: 'wú', input: 'wu' },
      { hanzi: '声', pinyin: 'shēng', input: 'sheng' },
      { hanzi: '去', pinyin: 'qù', input: 'qu' },
      { hanzi: '来', pinyin: 'lái', input: 'lai' },
      { hanzi: '还', pinyin: 'hái', input: 'hai' }
    ]
  },
  {
    id: 6,
    name: '第6组',
    desc: '词组化练习的好素材',
    chars: [
      { hanzi: '多', pinyin: 'duō', input: 'duo' },
      { hanzi: '少', pinyin: 'shǎo', input: 'shao' },
      { hanzi: '黄', pinyin: 'huáng', input: 'huang' },
      { hanzi: '牛', pinyin: 'niú', input: 'niu' },
      { hanzi: '只', pinyin: 'zhī', input: 'zhi' },
      { hanzi: '猫', pinyin: 'māo', input: 'mao' },
      { hanzi: '边', pinyin: 'biān', input: 'bian' },
      { hanzi: '鸭', pinyin: 'yā', input: 'ya' },
      { hanzi: '苹', pinyin: 'píng', input: 'ping' },
      { hanzi: '果', pinyin: 'guǒ', input: 'guo' },
      { hanzi: '杏', pinyin: 'xìng', input: 'xing' },
      { hanzi: '桃', pinyin: 'táo', input: 'tao' },
      { hanzi: '书', pinyin: 'shū', input: 'shu' },
      { hanzi: '包', pinyin: 'bāo', input: 'bao' },
      { hanzi: '尺', pinyin: 'chǐ', input: 'chi' },
      { hanzi: '作', pinyin: 'zuò', input: 'zuo' },
      { hanzi: '业', pinyin: 'yè', input: 'ye' },
      { hanzi: '本', pinyin: 'běn', input: 'ben' }
    ]
  },
  {
    id: 7,
    name: '第7组',
    desc: '区分平舌(cong)翘舌(zhong)',
    chars: [
      { hanzi: '笔', pinyin: 'bǐ', input: 'bi' },
      { hanzi: '刀', pinyin: 'dāo', input: 'dao' },
      { hanzi: '课', pinyin: 'kè', input: 'ke' },
      { hanzi: '早', pinyin: 'zǎo', input: 'zao' },
      { hanzi: '校', pinyin: 'xiào', input: 'xiao' },
      { hanzi: '明', pinyin: 'míng', input: 'ming' },
      { hanzi: '力', pinyin: 'lì', input: 'li' },
      { hanzi: '尘', pinyin: 'chén', input: 'chen' },
      { hanzi: '从', pinyin: 'cóng', input: 'cong' },
      { hanzi: '众', pinyin: 'zhòng', input: 'zhong' },
      { hanzi: '双', pinyin: 'shuāng', input: 'shuang' },
      { hanzi: '林', pinyin: 'lín', input: 'lin' },
      { hanzi: '森', pinyin: 'sēn', input: 'sen' },
      { hanzi: '条', pinyin: 'tiáo', input: 'tiao' },
      { hanzi: '升', pinyin: 'shēng', input: 'sheng' },
      { hanzi: '国', pinyin: 'guó', input: 'guo' },
      { hanzi: '旗', pinyin: 'qí', input: 'qi' },
      { hanzi: '中', pinyin: 'zhōng', input: 'zhong' }
    ]
  },
  {
    id: 8,
    name: '第8组',
    desc: '重点练习方位词拼音',
    chars: [
      { hanzi: '红', pinyin: 'hóng', input: 'hong' },
      { hanzi: '歌', pinyin: 'gē', input: 'ge' },
      { hanzi: '起', pinyin: 'qǐ', input: 'qi' },
      { hanzi: '么', pinyin: 'me', input: 'me' },
      { hanzi: '美', pinyin: 'měi', input: 'mei' },
      { hanzi: '丽', pinyin: 'lì', input: 'li' },
      { hanzi: '立', pinyin: 'lì', input: 'li' },
      { hanzi: '影', pinyin: 'yǐng', input: 'ying' },
      { hanzi: '前', pinyin: 'qián', input: 'qian' },
      { hanzi: '后', pinyin: 'hòu', input: 'hou' },
      { hanzi: '黑', pinyin: 'hēi', input: 'hei' },
      { hanzi: '狗', pinyin: 'gǒu', input: 'gou' },
      { hanzi: '左', pinyin: 'zuǒ', input: 'zuo' },
      { hanzi: '右', pinyin: 'yòu', input: 'you' },
      { hanzi: '它', pinyin: 'tā', input: 'ta' },
      { hanzi: '好', pinyin: 'hǎo', input: 'hao' },
      { hanzi: '朋', pinyin: 'péng', input: 'peng' },
      { hanzi: '友', pinyin: 'yǒu', input: 'you' },
      { hanzi: '比', pinyin: 'bǐ', input: 'bi' }
    ]
  },
  {
    id: 9,
    name: '第9组',
    desc: '注意"谁"(shei)的输入',
    chars: [
      { hanzi: '尾', pinyin: 'wěi', input: 'wei' },
      { hanzi: '巴', pinyin: 'ba', input: 'ba' },
      { hanzi: '谁', pinyin: 'shuí', input: 'shei' },
      { hanzi: '长', pinyin: 'cháng', input: 'chang' },
      { hanzi: '短', pinyin: 'duǎn', input: 'duan' },
      { hanzi: '把', pinyin: 'bǎ', input: 'ba' },
      { hanzi: '伞', pinyin: 'sǎn', input: 'san' },
      { hanzi: '兔', pinyin: 'tù', input: 'tu' },
      { hanzi: '最', pinyin: 'zuì', input: 'zui' },
      { hanzi: '公', pinyin: 'gōng', input: 'gong' },
      { hanzi: '写', pinyin: 'xiě', input: 'xie' },
      { hanzi: '诗', pinyin: 'shī', input: 'shi' },
      { hanzi: '点', pinyin: 'diǎn', input: 'dian' },
      { hanzi: '要', pinyin: 'yào', input: 'yao' },
      { hanzi: '给', pinyin: 'gěi', input: 'gei' },
      { hanzi: '当', pinyin: 'dāng', input: 'dang' },
      { hanzi: '串', pinyin: 'chuàn', input: 'chuan' }
    ]
  },
  {
    id: 10,
    name: '第10组',
    desc: '绿(lv)，注意输入v',
    chars: [
      { hanzi: '们', pinyin: 'men', input: 'men' },
      { hanzi: '以', pinyin: 'yǐ', input: 'yi' },
      { hanzi: '成', pinyin: 'chéng', input: 'cheng' },
      { hanzi: '数', pinyin: 'shù', input: 'shu' },
      { hanzi: '彩', pinyin: 'cǎi', input: 'cai' },
      { hanzi: '半', pinyin: 'bàn', input: 'ban' },
      { hanzi: '空', pinyin: 'kōng', input: 'kong' },
      { hanzi: '问', pinyin: 'wèn', input: 'wen' },
      { hanzi: '方', pinyin: 'fāng', input: 'fang' },
      { hanzi: '没', pinyin: 'méi', input: 'mei' },
      { hanzi: '更', pinyin: 'gèng', input: 'geng' },
      { hanzi: '绿', pinyin: 'lǜ', input: 'lv' },
      { hanzi: '出', pinyin: 'chū', input: 'chu' },
      { hanzi: '睡', pinyin: 'shuì', input: 'shui' },
      { hanzi: '那', pinyin: 'nà', input: 'na' },
      { hanzi: '海', pinyin: 'hǎi', input: 'hai' },
      { hanzi: '真', pinyin: 'zhēn', input: 'zhen' },
      { hanzi: '老', pinyin: 'lǎo', input: 'lao' }
    ]
  },
  {
    id: 11,
    name: '第11组',
    desc: '"着"多音字练习(zhe)',
    chars: [
      { hanzi: '师', pinyin: 'shī', input: 'shi' },
      { hanzi: '吗', pinyin: 'ma', input: 'ma' },
      { hanzi: '同', pinyin: 'tóng', input: 'tong' },
      { hanzi: '学', pinyin: 'xué', input: 'xue' },
      { hanzi: '亮', pinyin: 'liàng', input: 'liang' },
      { hanzi: '自', pinyin: 'zì', input: 'zi' },
      { hanzi: '己', pinyin: 'jǐ', input: 'ji' },
      { hanzi: '觉', pinyin: 'jué', input: 'jue' },
      { hanzi: '得', pinyin: 'de', input: 'de' },
      { hanzi: '很', pinyin: 'hěn', input: 'hen' },
      { hanzi: '穿', pinyin: 'chuān', input: 'chuan' },
      { hanzi: '衣', pinyin: 'yī', input: 'yi' },
      { hanzi: '服', pinyin: 'fú', input: 'fu' },
      { hanzi: '快', pinyin: 'kuài', input: 'kuai' },
      { hanzi: '又', pinyin: 'yòu', input: 'you' },
      { hanzi: '笑', pinyin: 'xiào', input: 'xiao' },
      { hanzi: '着', pinyin: 'zhe', input: 'zhe' },
      { hanzi: '向', pinyin: 'xiàng', input: 'xiang' }
    ]
  },
  {
    id: 12,
    name: '第12组',
    desc: '区分j, q, x与u相拼',
    chars: [
      { hanzi: '和', pinyin: 'hé', input: 'he' },
      { hanzi: '贝', pinyin: 'bèi', input: 'bei' },
      { hanzi: '娃', pinyin: 'wá', input: 'wa' },
      { hanzi: '挂', pinyin: 'guà', input: 'gua' },
      { hanzi: '活', pinyin: 'huó', input: 'huo' },
      { hanzi: '群', pinyin: 'qún', input: 'qun' },
      { hanzi: '竹', pinyin: 'zhú', input: 'zhu' },
      { hanzi: '牙', pinyin: 'yá', input: 'ya' },
      { hanzi: '用', pinyin: 'yòng', input: 'yong' },
      { hanzi: '几', pinyin: 'jǐ', input: 'ji' },
      { hanzi: '步', pinyin: 'bù', input: 'bu' },
      { hanzi: '为', pinyin: 'wèi', input: 'wei' },
      { hanzi: '参', pinyin: 'cān', input: 'can' },
      { hanzi: '加', pinyin: 'jiā', input: 'jia' },
      { hanzi: '洞', pinyin: 'dòng', input: 'dong' },
      { hanzi: '乌', pinyin: 'wū', input: 'wu' },
      { hanzi: '鸦', pinyin: 'yā', input: 'ya' }
    ]
  },
  {
    id: 13,
    name: '第13组',
    desc: '练习全(quan)三拼音节',
    chars: [
      { hanzi: '处', pinyin: 'chù', input: 'chu' },
      { hanzi: '找', pinyin: 'zhǎo', input: 'zhao' },
      { hanzi: '办', pinyin: 'bàn', input: 'ban' },
      { hanzi: '旁', pinyin: 'páng', input: 'pang' },
      { hanzi: '许', pinyin: 'xǔ', input: 'xu' },
      { hanzi: '法', pinyin: 'fǎ', input: 'fa' },
      { hanzi: '放', pinyin: 'fàng', input: 'fang' },
      { hanzi: '进', pinyin: 'jìn', input: 'jin' },
      { hanzi: '高', pinyin: 'gāo', input: 'gao' },
      { hanzi: '住', pinyin: 'zhù', input: 'zhu' },
      { hanzi: '孩', pinyin: 'hái', input: 'hai' },
      { hanzi: '玩', pinyin: 'wán', input: 'wan' },
      { hanzi: '吧', pinyin: 'ba', input: 'ba' },
      { hanzi: '发', pinyin: 'fā', input: 'fa' },
      { hanzi: '芽', pinyin: 'yá', input: 'ya' },
      { hanzi: '爬', pinyin: 'pá', input: 'pa' },
      { hanzi: '呀', pinyin: 'ya', input: 'ya' },
      { hanzi: '久', pinyin: 'jiǔ', input: 'jiu' },
      { hanzi: '回', pinyin: 'huí', input: 'hui' }
    ]
  },
  {
    id: 14,
    name: '第14组',
    desc: '常用对仗词练习',
    chars: [
      { hanzi: '全', pinyin: 'quán', input: 'quan' },
      { hanzi: '变', pinyin: 'biàn', input: 'bian' },
      { hanzi: '工', pinyin: 'gōng', input: 'gong' },
      { hanzi: '厂', pinyin: 'chǎng', input: 'chang' },
      { hanzi: '医', pinyin: 'yī', input: 'yi' },
      { hanzi: '院', pinyin: 'yuàn', input: 'yuan' },
      { hanzi: '生', pinyin: 'shēng', input: 'sheng' },
      { hanzi: '上', pinyin: 'shàng', input: 'shang' },
      { hanzi: '下', pinyin: 'xià', input: 'xia' },
      { hanzi: '千', pinyin: 'qiān', input: 'qian' },
      { hanzi: '万', pinyin: 'wàn', input: 'wan' }
    ]
  },
  {
    id: 15,
    name: '第15组',
    desc: '综合方位与动作练习',
    chars: [
      { hanzi: '错', pinyin: 'cuò', input: 'cuo' },
      { hanzi: '开', pinyin: 'kāi', input: 'kai' },
      { hanzi: '关', pinyin: 'guān', input: 'guan' },
      { hanzi: '入', pinyin: 'rù', input: 'ru' },
      { hanzi: '到', pinyin: 'dào', input: 'dao' }
    ]
  }
];

// 第五关：拼音句子数据
const PINYIN_SENTENCES = [
  {
    pinyin: 'wǒ ài bà ba mā ma',
    chars: ['我', '爱', '爸', '爸', '妈', '妈'],
    difficulty: 1
  },
  {
    pinyin: 'tiān shàng yǒu xīng xing',
    chars: ['天', '上', '有', '星', '星'],
    difficulty: 1
  },
  {
    pinyin: 'xiǎo niǎo zài tiān shàng fēi',
    chars: ['小', '鸟', '在', '天', '上', '飞'],
    difficulty: 1
  },
  {
    pinyin: 'dà jiā yì qǐ qù shàng xué',
    chars: ['大', '家', '一', '起', '去', '上', '学'],
    difficulty: 2
  },
  {
    pinyin: 'chūn tiān lái le huā kāi le',
    chars: ['春', '天', '来', '了', '花', '开', '了'],
    difficulty: 2
  },
  {
    pinyin: 'wǒ men shì hǎo péng you',
    chars: ['我', '们', '是', '好', '朋', '友'],
    difficulty: 2
  },
  {
    pinyin: 'xiǎo yú zài shuǐ lǐ yóu',
    chars: ['小', '鱼', '在', '水', '里', '游'],
    difficulty: 2
  },
  {
    pinyin: 'jīn tiān tiān qì zhēn hǎo',
    chars: ['今', '天', '天', '气', '真', '好'],
    difficulty: 3
  },
  {
    pinyin: 'yuè liang wān wān xiàng xiǎo chuán',
    chars: ['月', '亮', '弯', '弯', '像', '小', '船'],
    difficulty: 3
  },
  {
    pinyin: 'qīng qīng de cǎo dì shang yǒu huā',
    chars: ['青', '青', '的', '草', '地', '上', '有', '花'],
    difficulty: 3
  }
];
