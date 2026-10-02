import {CARDS} from './cards.mjs';
const p=(zh,en)=>Object.freeze({zh,en});
export const ELEMENTS=Object.freeze({
  fire:{name:p('火','Fire'),theme:p('意志、行动、创造与热情','Will, action, creativity and enthusiasm'),advice:p('让热情变成有方向的行动，同时留意精力与节奏。','Give enthusiasm a direction while respecting your energy and pace.')},
  water:{name:p('水','Water'),theme:p('感受、直觉、关系与情绪流动','Feeling, intuition, relationships and emotional flow'),advice:p('辨认自己的感受与需要，通过交流建立联结，也保留情绪边界。','Name feelings and needs, communicate for connection, and keep emotional boundaries.')},
  air:{name:p('风','Air'),theme:p('思考、语言、判断与冲突','Thought, language, judgment and conflict'),advice:p('区分事实、推测与感受，让清楚的表达支持判断，而不是用分析压过体验。','Separate facts, assumptions and feelings; let clear language support judgment rather than crowd out experience.')},
  earth:{name:p('土','Earth'),theme:p('身体、工作、资源与长期建设','Body, work, resources and lasting foundations'),advice:p('把需要落实到时间、技能与资源的安排上，用可持续的小步积累成果。','Translate needs into time, skills and resources; build through sustainable small steps.')},
});
const suitElements={wands:'fire',cups:'water',swords:'air',pentacles:'earth'};
const signs={
  aries:p('白羊座','Aries'),taurus:p('金牛座','Taurus'),gemini:p('双子座','Gemini'),cancer:p('巨蟹座','Cancer'),
  leo:p('狮子座','Leo'),virgo:p('处女座','Virgo'),libra:p('天秤座','Libra'),scorpio:p('天蝎座','Scorpio'),
  sagittarius:p('射手座','Sagittarius'),capricorn:p('摩羯座','Capricorn'),aquarius:p('水瓶座','Aquarius'),pisces:p('双鱼座','Pisces'),
};
const planets={sun:p('太阳','Sun'),moon:p('月亮','Moon'),mercury:p('水星','Mercury'),venus:p('金星','Venus'),mars:p('火星','Mars'),jupiter:p('木星','Jupiter'),saturn:p('土星','Saturn')};
// Book T attributions, with Strength VIII / Justice XI in the RWS order.
// Planetary trumps are not forced into a single element.
const majorCorrespondences=[
  ['air','air'],[null,'mercury'],[null,'moon'],[null,'venus'],['fire','aries'],['earth','taurus'],['air','gemini'],['water','cancer'],
  ['fire','leo'],['earth','virgo'],[null,'jupiter'],['air','libra'],['water','water'],['water','scorpio'],['fire','sagittarius'],['earth','capricorn'],
  [null,'mars'],['air','aquarius'],['water','pisces'],[null,'sun'],['fire','fire'],['earth','saturn'],
];
const decans={
  wands:[['mars','aries'],['sun','aries'],['venus','aries'],['saturn','leo'],['jupiter','leo'],['mars','leo'],['mercury','sagittarius'],['moon','sagittarius'],['saturn','sagittarius']],
  cups:[['venus','cancer'],['mercury','cancer'],['moon','cancer'],['mars','scorpio'],['sun','scorpio'],['venus','scorpio'],['saturn','pisces'],['jupiter','pisces'],['mars','pisces']],
  swords:[['moon','libra'],['saturn','libra'],['jupiter','libra'],['venus','aquarius'],['mercury','aquarius'],['moon','aquarius'],['jupiter','gemini'],['mars','gemini'],['sun','gemini']],
  pentacles:[['jupiter','capricorn'],['mars','capricorn'],['sun','capricorn'],['mercury','taurus'],['moon','taurus'],['saturn','taurus'],['sun','virgo'],['venus','virgo'],['mercury','virgo']],
};
const numberThemes=[
  p('0 · 尚未定型的可能','0 · Possibility before a fixed form'),
  p('1 · 起点、种子与潜能','1 · Beginnings, seeds and potential'),
  p('2 · 两种力量、选择与协调','2 · Two forces, choice and coordination'),
  p('3 · 发展、表达与协作','3 · Growth, expression and collaboration'),
  p('4 · 结构、稳定与边界','4 · Structure, stability and boundaries'),
  p('5 · 变化、摩擦与适应','5 · Change, friction and adaptation'),
  p('6 · 调整、互助与重新协调','6 · Adjustment, support and renewed harmony'),
  p('7 · 检验、辨别与自主选择','7 · Testing, discernment and independent choice'),
  p('8 · 运用力量、练习与推进','8 · Applying energy, practice and movement'),
  p('9 · 接近完成、积累与反思','9 · Near completion, experience and reflection'),
  p('10 · 一个周期的结果与下一轮起点','10 · A cycle reaching its result and a new beginning'),
];
const roles={
  11:{name:p('侍从 · 学习与探索','Page · Learning and exploration'),note:p('以初学者的好奇接近这个领域，重在接收信息、尝试与练习；也可指一种新出现的机会或心态。','Approach this domain with a beginner’s curiosity: receive information, experiment and practise. This can describe a new opportunity or attitude.')},
  12:{name:p('骑士 · 行动与追求','Knight · Action and pursuit'),note:p('把花色的力量带入行动，观察追求目标的方式与速度；既看推进的勇气，也看是否容易走向极端。','Carry the suit into action and examine the pace and manner of pursuit, including courage and the risk of taking an approach too far.')},
  13:{name:p('王后 · 内在成熟与滋养','Queen · Inner maturity and nurture'),note:p('以接纳、洞察与持续照顾经营这个领域，关注内在的稳定与关系质量，而不只是外在成绩。','Cultivate this domain through receptivity, insight and sustained care, attending to inner steadiness and the quality of relationships.')},
  14:{name:p('国王 · 掌握与承担责任','King · Mastery and responsibility'),note:p('成熟地运用花色的力量，为行动设方向并承担后果；关键是管理与责任，而不是权威或控制本身。','Use the suit with maturity, set a direction and take responsibility for consequences. The emphasis is stewardship rather than authority for its own sake.')},
};
// Original bilingual observations and reading lenses, based on the visible RWS art.
const majorDetails=[
  ['旅人站在悬崖边，白玫瑰与小包袱显出轻装出发的姿态，小狗提醒他留意脚下。','A traveller reaches a cliff with a white rose and a small bundle; the dog draws attention to the ground beneath the next step.','风的开放性与编号 0 相合：还未定型的道路需要好奇，也需要现实的支点。它邀请你试探未知，而不是把信任等同于完全不做准备。','Air and zero suggest an open, unformed path. Curiosity needs a practical foothold: trusting a beginning does not require abandoning preparation.','我愿意迈出的第一小步是什么？哪些基本条件需要先确认？','What first small step am I willing to take, and what essentials need checking?'],
  ['人物一手指天、一手指地，桌上的四件器物对应四个花色，无限符号提示可运用的潜能。','One hand points upward and one downward; four tools represent the suits, and the infinity sign suggests available potential.','水星强调表达、联结与转换。编号 1 把可能性推向开始：能力不只在于拥有工具，也在于知道如何组合它们并兑现承诺。','Mercury suggests communication, connection and translation. One moves potential toward a beginning; skill lies in organising tools and following through.','我已有的资源是什么？哪一个承诺可以在今天落实？','Which resources do I already have, and which commitment can I make concrete today?'],
  ['女祭司坐在黑白双柱之间，帷幕遮住后方，月牙与卷轴让可见和隐藏的信息并置。','The priestess sits between contrasting pillars; a veil, crescent and partly concealed scroll juxtapose what is visible and hidden.','月亮对应感受、周期与内在觉察，编号 2 指向两面并存。先容纳尚不清楚的部分，再区分直觉、情绪与证据，不急于把沉默解释成答案。','The Moon evokes feeling, cycles and inward attention; two allows contrasting sides to coexist. Hold uncertainty without treating silence or intuition as proof.','我还没有认真倾听什么？哪些感觉仍需要事实验证？','What have I not listened to, and which impressions still need checking?'],
  ['皇后身处麦田与树林，金星符号、柔软坐垫和星冠把生命力与接纳联系起来。','Wheat, trees, the Venus emblem, a soft seat and a starry crown connect the empress with vitality and receptivity.','金星关注价值、吸引与滋养，编号 3 表现为生长与创造。适合经营关系、身体和作品，但丰盛来自持续照顾，不等于无边界地给予。','Venus concerns value, attraction and nurture; three brings growth and creation. Care supports bodies, relationships and work without requiring limitless giving.','什么需要被耐心养成？我的付出是否也照顾了自己？','What needs patient cultivation, and does my giving include care for myself?'],
  ['石座上的公羊、山峦与盔甲显出秩序和防护，红袍则保留了行动的热度。','Rams, mountains and armour express order and protection, while the red robe retains the heat of action.','白羊座的火力配合编号 4 的结构：勇于建立规则和承担责任，也要检验规则服务的是现实需要还是控制欲。','Aries’ initiative meets the structure of four: establish boundaries and accept responsibility, while checking whether rules serve needs or merely control.','我需要建立哪条边界？怎样让规则既明确又有弹性？','Which boundary is needed, and how can a clear rule remain flexible?'],
  ['教皇坐在双柱之间，脚下有交叉钥匙，两名听者表现传授、共同仪式与组织关系。','The hierophant sits between pillars above crossed keys; two listeners evoke teaching, shared ritual and membership.','金牛座的土重视稳定与可传承的价值，编号 5 也提醒你检验既有秩序。可以借助传统和导师，但需要分辨哪些原则仍适合当下。','Taurus values stability and enduring principles, while five tests an existing order. Learn from tradition and mentors without assuming every inherited rule still fits.','我正在沿用谁的规则？它与我真正的价值相合吗？','Whose rule am I following, and does it fit my values?'],
  ['两个人物立于天使之下，背景中的两棵树让相遇、差异与选择同时进入画面。','Two figures stand beneath an angel; contrasting trees place encounter, difference and choice in the same scene.','双子座的风关注交流与两种立场，编号 6 寻求协调。此牌不只谈恋爱，更关乎能否诚实表达价值，并承担选择带来的联结与责任。','Gemini concerns communication and differing perspectives; six seeks coordination. Beyond romance, this is about honest values and responsibility within a chosen connection.','我真正愿意承诺什么？双方的意愿有没有被清楚表达？','What am I willing to commit to, and have both sides expressed their wishes?'],
  ['黑白斯芬克斯面向前方，驾车者居于中央，城墙在后，画面强调对不同力量的统合。','Contrasting sphinxes face forward beneath a central driver, with a city behind: differing forces must be brought together.','巨蟹座的水带入保护与情绪安全，编号 7 要求自主判断。向前推进需要一个内部一致的方向，而不只是靠更强的外部控制。','Cancer adds protection and emotional safety; seven asks for discernment. Progress needs an internally coherent direction rather than greater external pressure alone.','我正在追求自己的目标，还是只是想证明能够赢？','Am I pursuing my own direction, or only trying to prove I can win?'],
  ['人物温柔地靠近狮子的口部，头顶的无限符号提示柔和而持续的力量。','A figure gently attends to a lion’s jaws beneath an infinity sign, suggesting strength that is calm and sustained.','狮子座的火与编号 8 的力量运用相遇。勇气可以表现为诚实面对情绪、耐心练习与温和设界，而不是压制自己或他人。','Leo’s fire meets the application of energy in eight. Courage can mean honest feeling, patient practice and gentle boundaries rather than suppression.','哪种情绪需要理解而非压下？我怎样坚定而不强迫？','Which feeling needs understanding rather than suppression, and how can I be firm without force?'],
  ['隐者在高处举灯，灯中有星，手杖支持脚步；光只照亮眼前的一小段路。','A raised lantern containing a star and a supporting staff illuminate only the next part of a high, quiet path.','处女座的土关注辨别与细节，编号 9 回望经验。独处的意义在于形成自己的判断，也包括知道何时需要把发现带回关系与生活。','Virgo values discernment and detail; nine reflects on experience. Solitude develops judgment, then asks how insight can return to ordinary life and connection.','哪些投入值得继续？我的独处正在帮助辨认，还是变成隔绝？','What deserves further investment, and is solitude helping discernment or becoming isolation?'],
  ['轮盘周围有升降的形象，四角的有翼生物读着书，使变化与持续学习相互映照。','Figures rise and fall around a wheel while winged beings read in its corners, placing change alongside continuing learning.','木星带来扩展与周期视角，编号 10 是一轮经验的结果。留意环境变化与机会，同时区分能调整的行动和无法控制的时机。','Jupiter suggests expansion and a wider view; ten marks the result of a cycle. Notice changing conditions while distinguishing influence from control over timing.','我可以调整什么？哪一种反复出现的模式值得学习？','What can I adjust, and which recurring pattern deserves attention?'],
  ['正义一手持天平，一手竖起宝剑，正面坐姿强调平衡与清楚的判断。','A balanced scale, upright sword and frontal posture emphasise weighing evidence and making a clear judgment.','天秤座的风让公平建立在比较与对话上。编号 XI 保留伟特顺序，不简单约化成吉凶：先核实事实、权责与后果，再作选择。','Libra places fairness in comparison and dialogue. XI follows the RWS order: examine facts, responsibilities and consequences rather than reducing the card to a verdict.','我遗漏了哪一方的处境？我愿意承担自己选择的哪些后果？','Whose perspective is missing, and which consequences of my choice can I own?'],
  ['人物倒悬却神情平静，头部光环与弯曲的腿让暂停呈现为新的观察位置。','A calmly suspended figure, halo and bent leg make a pause into a different vantage point.','直接对应水元素，强调接受与重新感受。编号 XII 描绘旅程中的悬置阶段：暂停可以换来理解，但要区分主动放下与长期自我牺牲。','Its direct water attribution emphasises receptivity. XII is a suspended phase of the journey: a pause may bring perspective without requiring endless self-sacrifice.','什么用力已经无效？我希望这次暂停带来什么新的理解？','Which effort no longer helps, and what understanding should this pause bring?'],
  ['白马上的骷髅举着白花黑旗，不同身份的人面对它，远处双塔之间有光。','A skeletal rider on a white horse bears a flowered flag; people of different stations face it, with light between distant towers.','天蝎座的水深入结束与转化。编号 XIII 关注阶段更替：承认某种形式已经走到尽头，才能为仍有生命力的部分找到新的容器。','Scorpio turns toward endings and transformation. XIII concerns changing phases: accepting that one form has ended can create room for what remains alive.','什么已经完成，却仍被我紧握？怎样把告别落实为一次小整理？','What is complete but still held tightly, and how could I make one practical act of closure?'],
  ['天使在两只杯之间倒水，一脚在水中、一脚在地上，远处的小径通向光。','An angel pours between two cups with one foot in water and one on land; a distant path leads toward light.','射手座的火追求方向与意义，编号 XIV 的调和需要持续试验。把感受、行动与现实条件调成能长期维持的比例，不要求一次达到完美平衡。','Sagittarius seeks direction and meaning. XIV’s integration takes repeated adjustment: blend feeling, action and conditions into a workable rhythm rather than instant perfection.','哪两种需要可以兼容？我能先调整哪一个过度的部分？','Which needs can coexist, and which excess can I adjust first?'],
  ['两个人物戴着松垂的锁链，角与火把把欲望、束缚和可以觉察的习惯摆在眼前。','Two figures wear loose chains beneath horns and a torch, bringing desire, constraint and habitual attachment into view.','摩羯座的土提醒我们看资源、结构与长期依赖。编号 XV 关注选择怎样被缩窄：先识别交换的代价与可松动的环节，再恢复自主。','Capricorn draws attention to structures and enduring dependencies. XV asks how choice becomes narrower and what part of an attachment can begin to loosen.','这份依赖给我什么，又索取什么？我有哪些实际可行的选择？','What does this attachment give and cost, and which choices are practical now?'],
  ['闪电击中塔顶，冠冕坠落，人物离开高塔；稳定的外观在瞬间被打破。','Lightning strikes a tower, its crown falls and figures leave it; an apparently secure structure is disrupted.','火星带来冲击、冲突与迅速显露。编号 XVI 关注被现实挑战的结构，先保护基本需要，再区分必须重建的部分和仍可保留的基础。','Mars suggests impact, conflict and exposure. XVI examines a structure challenged by reality: secure essentials, then distinguish rebuilding from what can remain.','哪个问题已经不能靠掩盖解决？我需要先稳定哪一件事？','What can no longer be hidden, and what essential needs stabilising first?'],
  ['人物把水倒入池中与地上，头顶的大星和周围小星把恢复与更广阔的视野联系起来。','Water is poured into a pool and onto land beneath a large star and smaller stars, linking renewal with a wider perspective.','水瓶座的风支持新的视野与连结。编号 XVII 在动荡之后重新找到希望：让愿景回到身体、日常和可持续的支持，而非停在空想。','Aquarius supports a fresh perspective and connection. XVII restores hope after disruption by giving a vision daily care and practical support.','哪一个温和的小行动能帮助我恢复？我可以接受谁的支持？','Which gentle action would help renewal, and whose support can I receive?'],
  ['月光照着狗、狼与水中的甲壳生物，小径经过双塔，前路并没有完全显露。','Moonlight falls on a dog, wolf and creature emerging from water; a path passes towers without revealing its full course.','双鱼座的水强化想象与细微感受，编号 XVIII 带来不确定中的探索。感受值得倾听，但梦、担忧或投射都不能直接替代事实。','Pisces heightens imagination and subtle feeling. XVIII explores uncertainty: impressions deserve attention without turning dreams, fears or projections into facts.','我知道的事实有哪些？哪些只是尚未验证的担忧或希望？','Which things are known facts, and which are untested fears or hopes?'],
  ['孩子骑着白马，红旗、向日葵与明亮太阳构成开放、温暖而有生命力的画面。','A child on a white horse, a red banner, sunflowers and a bright sun create an open and lively scene.','太阳对应显明、活力与自我表达，编号 XIX 关注能被看见的成果。珍惜清楚与喜悦，也让乐观建立在真实沟通和已做到的事情上。','The Sun brings visibility, vitality and expression. XIX recognises what has become clear and fruitful, grounding optimism in honest communication and actual progress.','什么成果值得承认？怎样表达喜悦而不过度承诺？','What progress deserves recognition, and how can joy avoid becoming overpromising?'],
  ['天使吹响号角，人物从棺中起身，伸出的手把回应、更新与共同觉醒联系起来。','An angel’s trumpet calls figures to rise with outstretched hands, joining response, renewal and shared awakening.','直接对应火，强调被唤起的生命力。编号 XX 把过往经验带到新的评估中：回应重要的召唤可以是诚实调整，而不是用责备审判自己。','Its direct fire attribution emphasises renewed vitality. XX brings experience into a fresh evaluation, answering what matters through honest adjustment rather than self-condemnation.','哪一段经验需要重新理解？我希望回应什么真正重要的事？','Which experience needs a fresh understanding, and what important call do I want to answer?'],
  ['人物位于花环中央，四角的生物呼应整体与循环，双杖和舞姿显出完成中的流动。','A figure dances within a wreath; the corner beings and paired wands evoke a complete whole that remains in motion.','土与土星共同关注落实、时间和整合，编号 XXI 是旅程的完成。结束并不意味着静止：承认收获、做好收尾，再把经验带入下一阶段。','Earth and Saturn emphasise embodiment, time and integration. XXI completes a journey by recognising gains, closing unfinished details and carrying experience forward.','我还需要哪一个收尾动作？这段经历留下了什么可带走的能力？','What final act is needed, and which capacity can I carry forward?'],
];
const minorScenes={
  wands:[
    ['云中之手握着发芽的权杖，新芽强调尚待发展的行动潜力。','A hand holds a sprouting wand; new growth marks potential that needs action.'],
    ['人物站在城墙上握着地球，远眺的姿态把现有安全与更大的规划并置。','A figure holds a globe above a wall, weighing a secure base against wider possibilities.'],
    ['人物看向海上的船只，立于身边的三根权杖支持向外拓展的视线。','A figure watches ships with three wands nearby, looking beyond an established starting point.'],
    ['花环架在四根权杖上，人物在建筑前欢庆，展现成果与归属的基础。','A garland rests on four wands as figures celebrate near a building: a milestone and a shared base.'],
    ['五个人物交错举杖，动作各异，显示力量尚未找到共同的方向。','Five figures raise crossing wands without a common direction, suggesting competing energies.'],
    ['骑马的人物戴着桂冠，身边有同行者，胜利同时依靠个人努力与集体支持。','A crowned rider is accompanied by others; recognition rests on both effort and shared support.'],
    ['人物居于高处面对六根权杖，优势与防守压力同时存在。','A figure stands above six raised wands, holding an advantage while facing pressure.'],
    ['八根权杖划过开阔天空，画面没有人物，重点落在速度与力量的集中。','Eight wands cross an open sky without figures, concentrating attention on momentum.'],
    ['受伤的人物守在权杖前，防护与疲惫提醒我们留意坚持的成本。','An injured figure stands before wands; vigilance and fatigue reveal the cost of endurance.'],
    ['人物抱着十根权杖走向城镇，重量遮住视线，使责任成为具体负担。','A figure carries ten wands toward a town; their weight obscures the view and concentrates responsibility.'],
    ['侍从凝视发芽的权杖，沙地与远山给新想法留下探索空间。','A page studies a sprouting wand in an open landscape, giving a new idea room to develop.'],
    ['骑士的马抬起前蹄，衣上的火蜥蜴与举起的权杖强化热情和迅速行动。','A knight’s horse rises while salamander patterns and a raised wand emphasise enthusiasm and speed.'],
    ['王后手持向日葵与权杖，黑猫坐在脚边，自信与敏锐感受共同出现。','A queen holds a sunflower and wand above a black cat, combining confidence with perceptiveness.'],
    ['国王握着发芽的权杖，狮子与火蜥蜴装饰表达持续的意志和创造力。','A king holds a sprouting wand amid lion and salamander motifs, expressing enduring creative will.'],
  ],
  cups:[
    ['云中之手托起溢水的杯，鸽子与池中睡莲让接纳和情感流动成为主题。','A hand supports an overflowing cup above lilies, with a dove linking receptivity and feeling.'],
    ['两个人物交换杯子，上方的狮首与双蛇杖让平等交流和相互回应突出。','Two figures exchange cups beneath a lion and entwined staff, highlighting reciprocal encounter.'],
    ['三个人举杯相庆，脚边的收获把情感支持与共享成果联系起来。','Three figures raise cups amid a harvest, connecting friendship with shared abundance.'],
    ['人物坐在树下，面前有三杯，却尚未接过云中之手递来的第四杯。','A seated figure has three cups nearby but has not accepted a fourth offered from a cloud.'],
    ['披斗篷的人看向倒下的三杯，身后两杯仍立着，桥与建筑提示尚有归路。','A cloaked figure faces three fallen cups; two remain behind, with a bridge toward a possible return.'],
    ['孩子交换盛花的杯子，庭院与旧建筑把善意、回忆和熟悉感放在一起。','Children exchange a flower-filled cup within an old courtyard, joining kindness and memory.'],
    ['云中七杯盛着不同形象，有诱人也有令人不安的内容，想象需要辨别。','Seven cloud-borne cups hold tempting and unsettling visions that call for discernment.'],
    ['人物背向八只杯沿山路离开，月亮照着旅途，离开并不抹去曾经的投入。','A figure leaves eight cups under moonlight; departure does not erase earlier investment.'],
    ['人物坐在九杯前，整齐陈列与满足的姿态让获得与自我感受成为重点。','A seated figure displays nine cups; apparent plenty invites attention to felt satisfaction.'],
    ['一家人站在彩虹下，十杯与远方家园呈现共同生活的愿景。','A family stands under a rainbow of ten cups, presenting a vision of life shared together.'],
    ['侍从看着杯中探出的鱼，出人意料的形象连接敏感、想象与新消息。','A page looks at a fish emerging from a cup, linking imagination, sensitivity and a surprising message.'],
    ['骑士平静地举杯前行，带翼头盔和流动水景让理想带上行动方向。','A knight carries a cup calmly; a winged helmet and water suggest ideals moving toward action.'],
    ['王后凝视有盖的精巧杯子，海边的宝座使内在情感成为持续观察的对象。','A queen studies an ornate closed cup beside water, attending closely to inward feeling.'],
    ['国王稳坐在有浪的水面之上，船与鱼在旁，稳态并不依赖环境完全平静。','A king sits steadily above moving water, with a ship and fish nearby; composure does not require calm conditions.'],
  ],
  swords:[
    ['云中之手举起穿过王冠的剑，枝叶与远山使清晰、力量和判断的代价并存。','A hand raises a crowned sword above distant mountains, joining clarity, power and consequence.'],
    ['蒙眼的人交叉持剑，身后有水与月亮，防御姿态暂时挡住了感受和信息。','A blindfolded figure crosses swords before water and a moon, holding feeling and information at a distance.'],
    ['三剑穿过心形，雨云与直接的构图要求正视伤痛，而非将它藏起。','Three swords pierce a heart under rain clouds, asking that pain be acknowledged rather than hidden.'],
    ['躺卧人物双手合拢，三剑悬于墙上、一剑在身下，休止与警觉保持距离。','A resting figure lies apart from three wall-mounted swords and one below, creating a pause from conflict.'],
    ['前景的人拾起剑，其他人转身离开，所得与关系损伤需要一起衡量。','A figure gathers swords while others leave; gain must be weighed against damage to connection.'],
    ['船载着人物与六把剑离开，水面的变化提示过渡仍带着旧经验。','A boat carries figures and six swords away, making transition a journey that includes past experience.'],
    ['人物带走五剑并回头看，两剑留在原处，策略与行动的诚实性值得同时检查。','A figure takes five swords while looking back at two left behind, raising questions of strategy and integrity.'],
    ['蒙眼束缚的人立在剑阵中，脚下有水与空地，实际限制和感知限制并不完全相同。','A bound, blindfolded figure stands among swords with open ground nearby; constraints and perceptions may differ.'],
    ['人物从床上坐起捂住脸，墙上九剑将心中的压力置于夜间的安静背景中。','A figure sits up in bed beneath nine swords, placing distress in a quiet night-time setting.'],
    ['十剑落在俯卧的人物背上，远处天光出现，画面强调某种处境已经走到极限。','Ten swords mark a fallen figure while light appears beyond, showing a situation reaching its limit.'],
    ['侍从举剑回望，云与风中的树木显示警觉、学习与尚待辨别的信息。','A page raises a sword and looks back amid wind and clouds, suggesting alertness and information still being assessed.'],
    ['骑士迎风冲刺，剑高举，强烈方向感需要与判断和沟通相配。','A knight charges into the wind with a raised sword, demanding judgment to accompany forceful direction.'],
    ['王后举剑并伸出另一只手，开放的姿势与明确的界限并列。','A queen holds an upright sword and extends an open hand, combining receptivity with a clear boundary.'],
    ['国王正面端坐持剑，蝶纹与开阔天空把成熟判断和清楚规则联系起来。','A frontal king holds a sword amid butterfly motifs and open sky, connecting mature judgment with clear principles.'],
  ],
  pentacles:[
    ['云中之手托着星币，花园中的小径通向山峦，机会需要被落实为一段过程。','A hand offers a pentacle above a garden path toward mountains; an opportunity still needs a practical journey.'],
    ['人物以无限形带连接两枚星币，背后的船随浪起伏，平衡需要不断调整。','Two pentacles move within an infinity-shaped loop while ships rise on waves; balance is a continuing adjustment.'],
    ['工匠与两个人在建筑内交流，图纸与雕刻把技能、协作和标准联系起来。','An artisan speaks with two figures inside a building, joining craft, collaboration and shared standards.'],
    ['人物抱紧一币、脚踏两币、头顶一币，安全与紧握之间的张力十分明显。','A figure holds and anchors pentacles around the body, making the tension between security and a tight grip visible.'],
    ['两个人在雪中经过有星币的彩窗，困境与附近可能存在的支持同时出现。','Two figures pass a pentacle-lit window in snow, placing hardship beside possible support.'],
    ['人物持秤向他人分配星币，给予、接受和交换中的权力需要一起观察。','A figure distributes coins while holding scales, asking about giving, receiving and power within an exchange.'],
    ['人物倚着工具看向长有星币的植株，已投入的劳动需要阶段评估。','A figure rests on a tool beside a pentacle-bearing plant, taking stock of work already invested.'],
    ['工匠逐一雕刻星币，重复练习与专注使抽象能力成为具体作品。','An artisan works on pentacles one by one, turning repeated practice and concentration into tangible craft.'],
    ['人物站在成熟葡萄园中，手上有鸟，丰收与训练让独立成为经营的结果。','A figure stands in a rich vineyard with a bird, making independence an outcome of cultivation and practice.'],
    ['长者、家人、犬与建筑围绕十枚星币，资源进入共同生活与长期传承。','An elder, family, dogs and buildings surround ten pentacles, placing resources within shared life and continuity.'],
    ['侍从双手托币凝视，田野与山峦把学习的机会落实到可练习的现实领域。','A page studies a pentacle above fields and mountains, placing learning in a practical domain.'],
    ['骑士坐在静止的马上持币，耕地在后，稳健的推进并不总是外表上的速度。','A knight holds a pentacle on a still horse before worked land: progress need not look fast.'],
    ['王后在茂盛环境中端详星币，身旁的小动物和花木强调对生活条件的照顾。','A queen considers a pentacle amid plants and a small animal, attending to the conditions of everyday life.'],
    ['国王坐在葡萄与牛纹装饰之间，城堡与星币将经验、资源和稳固结构并置。','A king sits among vines and bull motifs with a castle beyond, joining experience, resources and durable structures.'],
  ],
};
export const ATTRIBUTE_METHOD=p(
  '花色元素采用火／权杖、水／圣杯、风／宝剑、土／星币。大牌与数字牌的占星对应参考黄金黎明《Book T》，沿用伟特力量 VIII、正义 XI 的编号；行星型大牌不强行归入单一元素。王牌视作元素本源，宫廷牌按角色解释，不指定单一出生星座。数字主题是辅助阅读线索；牌位、图像与所问之事优先，逆位不改变固定属性。',
  'Suit elements are Fire/Wands, Water/Cups, Air/Swords and Earth/Pentacles. Astrological correspondences for trumps and numbered minors follow Golden Dawn Book T, with RWS Strength VIII and Justice XI. Planetary trumps are not forced into one element. Aces are elemental roots; courts are read by role without assigning one birth sign. Number themes are reading aids: position, imagery and the question take priority, and reversal does not change a fixed attribution.');
export const KNOWLEDGE_SOURCES=Object.freeze([
  {title:'Book T · Liber LXXVIII',url:'https://sacred-texts.com/oto/lib78.htm'},
  {title:'The Pictorial Key to the Tarot',url:'https://en.wikisource.org/wiki/The_Pictorial_Key_to_the_Tarot'},
]);
const freeze=object=>{for(const value of Object.values(object))if(value&&typeof value==='object'&&!Object.isFrozen(value))freeze(value);return Object.freeze(object);};
export function getCardKnowledge(id) {
  if(!Number.isInteger(id)||!CARDS[id])throw new RangeError('Unknown card');
  return CARD_KNOWLEDGE[id];
}
export const CARD_KNOWLEDGE=Object.freeze(CARDS.map(card=>{
  let element,astrology,numberRole,symbols,lens,reflection;
  if(card.suit==='major'){
    const [key,correspondence]=majorCorrespondences[card.id],row=majorDetails[card.id];
    element=key;
    astrology=signs[correspondence]||planets[correspondence]||p(ELEMENTS[correspondence].name.zh+'元素（直接对应）',ELEMENTS[correspondence].name.en+' (direct elemental attribution)');
    if(card.id===21)astrology=p('土星 · 土元素','Saturn · Earth');
    numberRole=card.id<=10?numberThemes[card.id]:p(String(card.id)+' · '+card.keywords.zh.split(' · ')[0],String(card.id)+' · '+card.keywords.en.split(' · ')[0]);
    symbols=p(row[0],row[1]);lens=p(row[2],row[3]);reflection=p(row[4],row[5]);
  }else{
    element=suitElements[card.suit];symbols=p(...minorScenes[card.suit][card.rank-1]);
    numberRole=card.rank<=10?numberThemes[card.rank]:roles[card.rank].name;
    if(card.rank===1)astrology=p('元素本源 · 不指定单一星座','Elemental root · No single zodiac sign');
    else if(card.rank<=10){
      const [planet,sign]=decans[card.suit][card.rank-2];
      astrology=p(planets[planet].zh+'／'+signs[sign].zh,planets[planet].en+' in '+signs[sign].en);
    }else astrology=p('宫廷角色 · 不指定单一星座','Court role · No single zodiac sign');
    lens=card.rank<=10?p('把“'+numberRole.zh+'”放在'+ELEMENTS[element].theme.zh+'的领域里理解。数字提供发展阶段，图像指出这个阶段的具体处境，不把某个数字一概视作吉或凶。',
      'Read '+numberRole.en.toLowerCase()+' within '+ELEMENTS[element].theme.en.toLowerCase()+'. The number offers a stage; the image supplies its particular situation rather than a universal good or bad verdict.'):roles[card.rank].note;
    reflection=p('在'+ELEMENTS[element].theme.zh+'中，我当前最需要调整什么？我能落实哪一个小行动？',
      'What needs adjustment in '+ELEMENTS[element].theme.en.toLowerCase()+', and which small action can I make concrete?');
  }
  const elementTheme=element?ELEMENTS[element].theme:p('行星型大牌 · 依主导象征理解','Planetary trump · Read through its governing symbol');
  const grounding=element?ELEMENTS[element].advice:p('以主导象征连接具体问题，再用事实与实际条件检验行动。','Connect the governing symbol to the question, then check action against facts and practical conditions.');
  return freeze({id:card.id,element,elementTheme,astrology,numberRole,symbols,lens,reflection,
    application:p(card.upright.zh+' '+grounding.zh,card.upright.en+' '+grounding.en),
    upright:p(card.upright.zh+' '+lens.zh+' '+grounding.zh,card.upright.en+' '+lens.en+' '+grounding.en),
    reversed:p(card.reversed.zh+' 逆位可提示这份力量受阻、转向内在，或使用过度；结合画面与牌位，辨别需要恢复、减量或换一种表达的部分。它不会把元素或占星对应改成相反属性。',
      card.reversed.en+' Reversal can suggest this energy is blocked, inwardly directed or overused. Use the image and position to distinguish recovery, moderation or a different expression; it does not invert the fixed element or astrological attribution.')});
}));
export function summariseAttributes(cards,lang='zh'){
  if(!['zh','en'].includes(lang))throw new RangeError('Unknown language');
  const counts={fire:0,water:0,air:0,earth:0},numbers=new Map();let planetary=0,major=0,court=0;
  for(const draw of cards){
    const card=CARDS[draw.id],knowledge=getCardKnowledge(draw.id);
    if(knowledge.element)counts[knowledge.element]++;else planetary++;
    if(card.suit==='major')major++;else if(card.rank>10)court++;else numbers.set(card.rank,(numbers.get(card.rank)||0)+1);
  }
  return {counts,planetary,major,court,repeatedNumbers:[...numbers].filter(([,count])=>count>1),
    elements:Object.entries(counts).filter(([,count])=>count).map(([key,count])=>({key,count,name:ELEMENTS[key].name[lang],theme:ELEMENTS[key].theme[lang]}))};
}
