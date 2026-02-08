// 《拼音大冒险》— 声母/韵母/整体认读音节数据

const SHENGMU = [
  'b', 'p', 'm', 'f',
  'd', 't', 'n', 'l',
  'g', 'k', 'h',
  'j', 'q', 'x',
  'zh', 'ch', 'sh', 'r',
  'z', 'c', 's',
  'y', 'w'
];

const DAN_YUNMU = ['a', 'o', 'e', 'i', 'u', 'ü'];
const DAN_YUNMU_INPUT = ['a', 'o', 'e', 'i', 'u', 'v'];

const FU_YUNMU = ['ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er'];
const FU_YUNMU_INPUT = ['ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 've', 'er'];

const BI_YUNMU = ['an', 'en', 'in', 'un', 'ün', 'ang', 'eng', 'ing', 'ong'];
const BI_YUNMU_INPUT = ['an', 'en', 'in', 'un', 'vn', 'ang', 'eng', 'ing', 'ong'];

const ZHENGTI_RENDU = [
  'zhi', 'chi', 'shi', 'ri',
  'zi', 'ci', 'si',
  'yi', 'wu', 'yu',
  'ye', 'yue', 'yuan',
  'yin', 'yun', 'ying'
];

// 第一关波次设计
const SHENGMU_WAVES = [
  { name: '第一波', desc: '最简单的声母', items: ['b', 'p', 'm', 'f'] },
  { name: '第二波', desc: '舌尖声母', items: ['d', 't', 'n', 'l'] },
  { name: '第三波', desc: '易混淆对比', items: ['b', 'd', 'p', 'q'] },
  { name: '第四波', desc: '翘舌音组合', items: ['zh', 'ch', 'sh', 'r'] },
  { name: '第五波', desc: '全部声母乱序', items: [...SHENGMU] }
];

// 第二关：韵母分波
const YUNMU_WAVES = [
  { name: '单韵母', desc: '最基础的6个韵母', items: DAN_YUNMU_INPUT },
  { name: '复韵母(上)', desc: 'ai ei ui ao ou', items: ['ai', 'ei', 'ui', 'ao', 'ou'] },
  { name: '复韵母(下)', desc: 'iu ie ve er', items: ['iu', 'ie', 've', 'er'] },
  { name: '前鼻韵母', desc: 'an en in un vn', items: ['an', 'en', 'in', 'un', 'vn'] },
  { name: '后鼻韵母', desc: 'ang eng ing ong', items: ['ang', 'eng', 'ing', 'ong'] }
];

// 第三关：声韵组合数据
const LIANG_PIN_DATA = [
  { shengmu: 'b', yunmu: 'a', result: 'ba', display: 'bā', hanzi: '八' },
  { shengmu: 'm', yunmu: 'a', result: 'ma', display: 'mā', hanzi: '妈' },
  { shengmu: 'b', yunmu: 'o', result: 'bo', display: 'bō', hanzi: '波' },
  { shengmu: 'p', yunmu: 'o', result: 'po', display: 'pō', hanzi: '坡' },
  { shengmu: 'm', yunmu: 'u', result: 'mu', display: 'mù', hanzi: '木' },
  { shengmu: 'f', yunmu: 'u', result: 'fu', display: 'fù', hanzi: '父' },
  { shengmu: 'd', yunmu: 'a', result: 'da', display: 'dà', hanzi: '大' },
  { shengmu: 't', yunmu: 'a', result: 'ta', display: 'tā', hanzi: '他' },
  { shengmu: 'n', yunmu: 'i', result: 'ni', display: 'nǐ', hanzi: '你' },
  { shengmu: 'l', yunmu: 'i', result: 'li', display: 'lǐ', hanzi: '里' },
  { shengmu: 'g', yunmu: 'e', result: 'ge', display: 'gē', hanzi: '歌' },
  { shengmu: 'k', yunmu: 'e', result: 'ke', display: 'kè', hanzi: '课' },
  { shengmu: 'h', yunmu: 'e', result: 'he', display: 'hé', hanzi: '河' },
  { shengmu: 'j', yunmu: 'i', result: 'ji', display: 'jī', hanzi: '鸡' },
  { shengmu: 'q', yunmu: 'i', result: 'qi', display: 'qī', hanzi: '七' },
  { shengmu: 'x', yunmu: 'i', result: 'xi', display: 'xǐ', hanzi: '洗' },
  { shengmu: 'zh', yunmu: 'u', result: 'zhu', display: 'zhú', hanzi: '竹' },
  { shengmu: 'ch', yunmu: 'u', result: 'chu', display: 'chū', hanzi: '出' },
  { shengmu: 'sh', yunmu: 'u', result: 'shu', display: 'shū', hanzi: '书' },
  { shengmu: 'r', yunmu: 'i', result: 'ri', display: 'rì', hanzi: '日' },
  { shengmu: 'z', yunmu: 'i', result: 'zi', display: 'zì', hanzi: '字' },
  { shengmu: 'c', yunmu: 'i', result: 'ci', display: 'cí', hanzi: '词' },
  { shengmu: 's', yunmu: 'i', result: 'si', display: 'sī', hanzi: '丝' },
  { shengmu: 'h', yunmu: 'ua', result: 'hua', display: 'huā', hanzi: '花' },
  { shengmu: 'sh', yunmu: 'ui', result: 'shui', display: 'shuǐ', hanzi: '水' },
  { shengmu: 'g', yunmu: 'uo', result: 'guo', display: 'guó', hanzi: '国' },
  { shengmu: 'l', yunmu: 'an', result: 'lan', display: 'lán', hanzi: '蓝' },
  { shengmu: 't', yunmu: 'ian', result: 'tian', display: 'tiān', hanzi: '天' },
  { shengmu: 'x', yunmu: 'ing', result: 'xing', display: 'xīng', hanzi: '星' },
  { shengmu: 'ch', yunmu: 'un', result: 'chun', display: 'chūn', hanzi: '春' }
];
