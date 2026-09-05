import { VERBS } from './grammar/irregularVerbs';

/** Authored language data. Slots are combined only inside compatible grammatical frames. */
export interface PracticeItem {
  key: string;
  sentence: string;
  answer: string;
  wrong: string[];
  cue: string;
  rule: string;
  explanation: string;
  vocabulary: string;
}

// singular | plural | indefinite article | natural location
const nouns = `book|books|a|on the shelf
apple|apples|an|in the basket
chair|chairs|a|beside the desk
umbrella|umbrellas|an|by the door
box|boxes|a|in the garage
watch|watches|a|in the drawer
knife|knives|a|on the counter
scarf|scarves|a|in the wardrobe
dictionary|dictionaries|a|in the library
orange|oranges|an|in the bowl
photo|photos|a|on the wall
toy|toys|a|under the bed
key|keys|a|near the entrance
brush|brushes|a|beside the mirror
leaf|leaves|a|on the path
tomato|tomatoes|a|in the greenhouse
potato|potatoes|a|in the sack
battery|batteries|a|in the cupboard
envelope|envelopes|an|on the tray
egg|eggs|an|in the fridge
coin|coins|a|in the pocket
ticket|tickets|a|inside the wallet
cup|cups|a|on the table
plate|plates|a|in the kitchen
lamp|lamps|a|beside the sofa
bicycle|bicycles|a|outside the shop
bus|buses|a|near the station
bench|benches|a|in the garden
cherry|cherries|a|on the cake
strawberry|strawberries|a|in the lunchbox
peach|peaches|a|in the crate
glass|glasses|a|beside the sink
mouse|mice|a|behind the fence
child|children|a|in the playground
woman|women|a|at the reception desk
man|men|a|at the bus stop
person|people|a|near the fountain
goose|geese|a|beside the pond
sheep|sheep|a|in the field
deer|deer|a|among the trees
ox|oxen|an|near the barn
aircraft|aircraft|an|at the airport`.split('\n').map(row => row.split('|'));

// infinitive | third person | past | participle | complement
const actions = `read|reads|read|read|a magazine
write|writes|wrote|written|a postcard
buy|buys|bought|bought|fresh vegetables
bring|brings|brought|brought|a packed lunch
make|makes|made|made|a paper boat
take|takes|took|taken|a photograph
draw|draws|drew|drawn|a mountain
sing|sings|sang|sung|a folk song
drink|drinks|drank|drunk|orange juice
eat|eats|ate|eaten|a cheese sandwich
find|finds|found|found|a quiet spot
choose|chooses|chose|chosen|a colourful scarf
send|sends|sent|sent|a short message
build|builds|built|built|a wooden model
wear|wears|wore|worn|a green jacket
sell|sells|sold|sold|homemade jam
catch|catches|caught|caught|the early train
teach|teaches|taught|taught|a dance class
feed|feeds|fed|fed|the neighbour's cat
grow|grows|grew|grown|red roses
hold|holds|held|held|a tiny kitten
leave|leaves|left|left|a note
meet|meets|met|met|a new colleague
hear|hears|heard|heard|a strange noise
lose|loses|lost|lost|a blue pen
break|breaks|broke|broken|a dry branch
forget|forgets|forgot|forgotten|the address
win|wins|won|won|a small prize
wash|washes|washed|washed|the dishes
fix|fixes|fixed|fixed|a broken radio
carry|carries|carried|carried|a heavy suitcase
study|studies|studied|studied|French poetry
play|plays|played|played|the violin
visit|visits|visited|visited|a local museum
paint|paints|painted|painted|a seaside scene
clean|cleans|cleaned|cleaned|the bedroom
open|opens|opened|opened|a sealed parcel
close|closes|closed|closed|the garden gate
prepare|prepares|prepared|prepared|a simple meal
repair|repairs|repaired|repaired|an old clock
collect|collects|collected|collected|postage stamps
pack|packs|packed|packed|a travel bag`.split('\n').map(row => row.split('|'));

const names = ['Maya', 'Leo', 'Nina', 'Omar', 'Sofia', 'Ben', 'Eva', 'Adam', 'Zoe', 'Max', 'Anna', 'Tom'];
const materials = ['water', 'milk', 'rice', 'sugar', 'flour', 'salt', 'butter', 'cheese', 'bread', 'honey', 'coffee', 'tea', 'juice', 'oil', 'soup', 'pasta', 'sand', 'snow', 'ice', 'wood', 'wool', 'cotton', 'gold', 'silver', 'money', 'luggage', 'furniture', 'equipment', 'information', 'advice', 'homework', 'news'];

export function buildPracticePool(lectureId: string): PracticeItem[] {
  const items: PracticeItem[] = [];
  const lesson = lectureId.replace('lecture_a1_', '');
  const add = (sentence: string, answer: string, wrong: string[], cue: string, rule: string, explanation: string, vocabulary: string) => {
    const distractors = [...new Set(wrong)].filter(value => value.toLowerCase() !== answer.toLowerCase());
    if (!distractors.length) throw new Error(`No distractors: ${sentence}`);
    items.push({ key: sentence, sentence, answer, wrong: distractors, cue, rule, explanation, vocabulary });
  };
  nouns.forEach(([one, many, article, place], i) => {
    const n = lesson === '4_1' ? ['Maya', 'Nina', 'Sofia', 'Eva', 'Zoe', 'Anna'][i % 6] : names[i % names.length];
    if (['4_2', '4_3'].includes(lesson) && i >= 32) return;
    switch (lesson) {
      case '1_1':
        add(`The ${one} ___ ${place}.`, 'is', ['are', 'am', 'be'], 'Вставьте полную форму to be.', 'singular', 'С подлежащим в единственном числе употребляется is.', one);
        add(`The ${many} ___ ${place}.`, 'are', ['is', 'am', 'be'], 'Вставьте полную форму to be.', 'plural', 'С подлежащим во множественном числе употребляется are.', one);
        add(`I ___ looking for ${article} ${one}.`, 'am', ['is', 'are', 'be'], 'Вставьте полную форму to be.', 'first-person', 'После I используется am.', one);
        add(`We___ looking for the ${many}.`, "'re", ["'s", "'m", "'ve"], 'Впишите сокращение are с апострофом.', 'contraction', 'We are сокращается до we’re.', one);
        break;
      case '1_2':
        add(`___ the ${one} ${place}?`, 'Is', ['Are', 'Am', 'Does'], 'Вставьте to be для вопроса.', 'question-singular', 'В вопросе is ставится перед подлежащим в единственном числе.', one);
        add(`___ the ${many} ${place}?`, 'Are', ['Is', 'Am', 'Do'], 'Вставьте to be для вопроса.', 'question-plural', 'В вопросе are ставится перед подлежащим во множественном числе.', one);
        add(`The ${one} ___ ${place}.`, "isn't", ["aren't", "don't", "doesn't"], 'Сделайте отрицание: используйте сокращённую форму to be.', 'negative', 'Отрицание is — is not или isn’t.', one);
        add(`The ${many} ___ ${place}.`, "aren't", ["isn't", "doesn't", "don't"], 'Сделайте отрицание: используйте сокращённую форму to be.', 'negative-plural', 'Отрицание are — are not или aren’t.', one);
        break;
      case '1_3':
        for (const [subject, verb, noun, distance] of [['This', 'is', one, 'здесь, рядом'], ['That', 'is', one, 'там, вдали'], ['These', 'are', many, 'здесь, рядом'], ['Those', 'are', many, 'там, вдали']]) {
          add(`___ ${verb} the ${noun} I mean.`, subject, ['This', 'That', 'These', 'Those'], `Укажите на предметы: ${distance}.`, `${subject}`, 'This/that — единственное число; these/those — множественное. This/these — рядом, that/those — вдали.', one);
        }
        break;
      case '3_1':
        add(`The ${many} ___ ${place}.`, 'are', ['is', 'am', 'be'], 'Согласуйте to be с существительным.', 'countable', `${many} — исчисляемое существительное во множественном числе, поэтому are.`, one);
        add(`We counted three ___ ${place}.`, many, [one + 's', one + 'es', one].filter(v => v !== many), `Поставьте ${one} во множественное число.`, 'countable-number', `После three нужна форма множественного числа: ${many}.`, one);
        break;
      case '3_2':
        for (const [start, end] of [['I noticed two', place], ['We counted several', 'during our walk'], ['Can you see those', place], ['They pointed to three', 'in the photograph']]) {
          add(`${start} ___ ${end}${start.startsWith('Can') ? '?' : '.'}`, many, [one, one + 's', one + 'es', many + 's'], `Множественное число слова ${one}.`, one === many ? 'unchanged' : ['children', 'women', 'men', 'people', 'mice', 'geese', 'oxen'].includes(many) ? 'irregular' : many.endsWith('ies') ? 'ies' : many.endsWith('ves') ? 'ves' : many.endsWith('es') ? 'es' : 's', `Множественное число ${one} — ${many}.`, one);
        }
        break;
      case '3_3':
        add(`I can see ___ ${one} ${place}.`, article, ['a', 'an', 'the', '—'], 'Первое упоминание одного неопределённого предмета: выберите a или an.', article, `${article} ставится перед ${one}: артикль зависит от первого звука.`, one);
        add(`There is ${article} ${one} ${place}. ___ ${one} is easy to see.`, 'The', ['A', 'An', '—'], 'Предмет уже упомянут. Вставьте артикль.', 'known', 'Повторное упоминание конкретного предмета требует the.', one);
        add(`___ ${many} can be found in many countries.`, '—', ['A', 'An', 'The'], 'Речь о категории в целом. Для нулевого артикля введите —.', 'zero', 'Перед существительным во множественном числе в общем значении артикль не нужен.', one);
        break;
      case '4_1':
        add(`${n} is looking for the ${one}. Can you help ___?`, 'her', ['she', 'hers', 'he'], 'Вставьте объектное местоимение женского рода.', 'object', 'После help нужен объект: her, а не she.', one);
        add(`The ${many} are ${place}. ___ are easy to see.`, 'They', ['Them', 'Their', 'Theirs'], 'Замените подлежащее местоимением.', 'subject', 'В роли подлежащего используется they.', one);
        add(`We need the ${one}. Please bring it to ___.`, 'us', ['we', 'our', 'ours'], 'Замените «нам» местоимением.', 'preposition', 'После to используется объектное местоимение us.', one);
        break;
      case '4_2':
        add(`This ${one} belongs to me. It is ___.`, 'mine', ['my', 'me', 'I'], 'Вставьте самостоятельную притяжательную форму.', 'independent', 'Без существительного используется mine.', one);
        add(`Those ${many} belong to us. They are ___ ${many}.`, 'our', ['ours', 'us', 'we'], 'Вставьте притяжательное слово перед существительным.', 'dependent', 'Перед существительным ставится our, а не ours.', one);
        add(`This ${one} belongs to you. Is it really ___?`, 'yours', ['your', 'you', 'yourself'], 'Вставьте самостоятельную притяжательную форму.', 'independent-you', 'Yours употребляется самостоятельно, без существительного.', one);
        break;
      case '4_3':
        add(`That is ___ ${one}.`, `${n}'s`, [n, `${n}s'`, `${n}s`], `Предмет принадлежит ${n}. Вставьте имя с апострофом.`, 'singular-owner', 'К имени одного владельца добавляется ’s.', one);
        add(`These are the ___ ${many}.`, "teachers'", ["teacher's", 'teachers', 'teacher'], 'Предметы принадлежат нескольким учителям (teachers). Добавьте апостроф.', 'plural-owner', 'После множественного числа на -s ставится только апостроф.', one);
        add(`We found the ___ ${one}.`, "children's", ["childrens'", 'childrens', "child's"], 'Предмет принадлежит детям (children). Добавьте показатель принадлежности.', 'irregular-owner', 'Children не оканчивается на -s: добавляем ’s.', one);
        break;
      case '5_2': {
        const [prep, ...rest] = place.split(' ');
        // Only the lecture's in/on/at contrast; other locations remain noun contexts elsewhere.
        for (const [p, location] of [[prep, rest.join(' ')], ['in', i < 25 ? 'a closed container' : 'a large enclosure'], ['on', i < 25 ? 'a flat surface' : 'a raised platform'], ['at', 'the pickup point']]) {
          if (!['in', 'on', 'at'].includes(p)) continue;
          add(`The ${one} is ___ ${location}.`, p, ['in', 'on', 'at', 'to'], `Выберите in/on/at: ${p === 'in' ? 'внутри' : p === 'on' ? 'на поверхности' : 'в указанной точке'}.`, p, 'In — внутри объёма; on — на поверхности; at — в точке или месте встречи.', one);
        }
        break;
      }
      case '6_1':
        add(`There ___ ${article} ${one} ${place}.`, 'is', ['are', 'am', 'be'], 'Вставьте полную форму to be.', 'singular', 'There is употребляется с одним предметом.', one);
        add(`There ___ several ${many} ${place}.`, 'are', ['is', 'am', 'be'], 'Вставьте полную форму to be.', 'plural', 'There are употребляется с несколькими предметами.', one);
        add(`___ there any ${many} ${place}?`, 'Are', ['Is', 'Am', 'Do'], 'Постройте вопрос с there.', 'question', 'В вопросе are ставится перед there.', one);
        add(`There ___ any ${many} ${place}.`, "aren't", ["isn't", "don't", "doesn't"], 'Вставьте сокращённое отрицание to be.', 'negative', 'Для множественного числа: there aren’t any.', one);
        break;
      case '6_2':
        add(`There are ___ ${many} ${place}.`, 'some', ['any', 'a', 'an'], 'Сообщите, что несколько предметов есть: some или any.', 'positive', 'В обычном утвердительном предложении употребляется some.', one);
        add(`There aren't ___ ${many} ${place}.`, 'any', ['some', 'no', 'a'], 'Вставьте some/any/no.', 'negative', 'После aren’t используется any; no создало бы двойное отрицание.', one);
        add(`There are ___ ${many} ${place}; the place is empty.`, 'no', ['some', 'any', 'a'], 'Вставьте some/any/no.', 'none', 'No само выражает отсутствие и используется с утвердительным глаголом.', one);
        break;
      case '6_3':
        add(`How ___ ${many} can you see ${place}?`, 'many', ['much', 'a little', 'a few'], 'Вставьте much или many.', 'countable', 'Many употребляется с исчисляемыми существительными во множественном числе.', one);
        add(`We need ___ ${many}, just two or three.`, 'a few', ['a little', 'much', 'a'], 'Вставьте a few или a little.', 'small-countable', 'A few — небольшое количество исчисляемых предметов.', one);
        break;
      case '8_1':
        add(`The ${one} ___ ${place} yesterday.`, 'was', ['were', 'is', 'are'], 'Вставьте was или were.', 'singular', 'В прошедшем времени с единственным числом используется was.', one);
        add(`The ${many} ___ ${place} last night.`, 'were', ['was', 'are', 'is'], 'Вставьте was или were.', 'plural', 'В прошедшем времени с множественным числом используется were.', one);
        add(`___ the ${one} ${place} yesterday?`, 'Was', ['Were', 'Did', 'Is'], 'Составьте вопрос в Past Simple с to be.', 'question', 'Was ставится перед подлежащим; did с to be не нужен.', one);
        add(`The ${many} ___ ${place} yesterday.`, "weren't", ["wasn't", "didn't", "aren't"], 'Вставьте сокращённое отрицание was/were.', 'negative', 'Отрицательная форма were — weren’t.', one);
        break;
    }
  });
  actions.forEach(([base, third, past, participle, object], i) => {
    const n = names[i % names.length];
    if (lesson.startsWith('7_') && ['lose', 'forget', 'hear', 'find', 'win', 'break'].includes(base)) return;
    const inf = `${base} ${object}`;
    switch (lesson) {
      case '2_1':
        add(`${n} usually ___ ${object}.`, third, [base, `${base}ing`, past, `${third}s`], `Present Simple: поставьте ${base} в нужную форму.`, third.endsWith('ies') ? 'ies' : third.endsWith('es') ? 'es' : 's', `В третьем лице единственного числа ${base} принимает форму ${third}.`, base);
        add(`My neighbours often ___ ${object}.`, base, [third, `${base}ing`, past, `${third}s`], `Present Simple: поставьте ${base} в нужную форму.`, 'plural', 'После подлежащего во множественном числе используется начальная форма глагола.', base);
        add(`I sometimes ___ ${object}.`, base, [third, `${base}ing`, past, `${third}s`], `Present Simple: поставьте ${base} в нужную форму.`, 'first-person', 'После I окончание -s не добавляется.', base);
        break;
      case '2_2':
        add(`___ ${n} often ${inf}?`, 'Does', ['Do', 'Is', 'Are'], 'Вопрос в Present Simple: do или does?', 'does', 'С одним человеком используется does, смысловой глагол остаётся в начальной форме.', base);
        add(`___ your friends usually ${inf}?`, 'Do', ['Does', 'Are', 'Is'], 'Вопрос в Present Simple: do или does?', 'do', 'С множественным числом используется do.', base);
        add(`${n} doesn't ___ ${object}.`, base, [third, past, `${base}ing`, `${third}s`], `Отрицание в Present Simple: вставьте форму ${base}.`, 'base', 'После doesn’t используется начальная форма глагола.', base);
        add(`We ___ ${inf}.`, "don't", ["doesn't", "isn't", "aren't"], 'Сделайте отрицание в Present Simple (сокращённая форма).', 'negative', 'После we используется don’t.', base);
        break;
      case '2_3':
        add(`${n} ___ ready to ${inf}.`, 'is always', ['always is', 'always are', 'is always not'], 'Поставьте is и always в нейтральном порядке: наречие после to be.', 'after-be', 'В нейтральном порядке наречие частотности ставится после to be: is always.', base);
        add(`We ___ ${object}.`, `never ${base}`, [`don't never ${base}`, `never not ${base}`, `never ${third}`], `Скажите «никогда не ${base}»: избегайте двойного отрицания.`, 'no-double-negative', 'Never само выражает отрицание; don’t добавлять не нужно.', base);
        for (const [adverb, russian] of [['always', 'всегда'], ['often', 'часто'], ['never', 'никогда'], ['sometimes', 'иногда']]) {
          add(`${n} ___ ${object}.`, `${adverb} ${third}`, [`${third} ${adverb}`, `${adverb} ${base}`, `${base} ${adverb}`], `Вставьте «${russian} ${base}»: нейтральный порядок, наречие перед смысловым глаголом.`, adverb, `В нейтральном порядке ${adverb} стоит перед смысловым глаголом; после ${n} нужна форма ${third}.`, base);
        }
        break;
      case '7_1':
        add(`${n} can ___ ${object}.`, base, [third, `to ${base}`, `${base}ing`], `После can вставьте форму ${base}.`, 'base', 'После can нужен инфинитив без to и без -s.', base);
        add(`___ you ${inf}, please?`, 'Can', ['Do can', 'Are can', 'Does can'], 'Начните вежливую просьбу с can.', 'request', 'Can ставится перед подлежащим без вспомогательного do.', base);
        add(`${n} ___ ${inf}.`, "can't", ["doesn't can", "don't can", "isn't can"], 'Выразите отсутствие способности, используя сокращение cannot.', 'negative', 'Отрицательная форма can — cannot или can’t.', base);
        break;
      case '7_2':
        add(`You must ___ ${object}.`, base, [`to ${base}`, third, `${base}ing`], `Вставьте форму ${base} после must.`, 'base', 'После must используется инфинитив без to.', base);
        add(`You ___ ${inf}. It is forbidden here.`, "mustn't", ['must', "don't have to", 'can'], 'Выразите строгий запрет с must.', 'prohibition', 'Mustn’t означает запрет; don’t have to — отсутствие необходимости.', base);
        add(`You ___ ${inf}. It is compulsory today.`, 'must', ["mustn't", "don't have to", "can't"], 'Выразите обязательность с must.', 'obligation', 'Must выражает обязанность.', base);
        break;
      case '7_3':
        add(`${n} ___ ${inf} today.`, 'has to', ['have to', 'has', 'must to'], 'Используйте have to: это обязательное требование.', 'third-person', 'В третьем лице единственного числа have to превращается в has to.', base);
        add(`We ___ ${inf} today. It is optional.`, "don't have to", ["mustn't", 'have to', 'must'], 'Выразите отсутствие необходимости с have to.', 'optional', 'Don’t have to означает «необязательно», а mustn’t — «запрещено».', base);
        add(`Does ${n} ___ ${inf}?`, 'have to', ['has to', 'must to', 'has'], 'Вставьте have to в правильной форме.', 'question', 'После does используется have to, а не has to.', base);
        add(`I must ___ ${object} today.`, base, [`to ${base}`, third, `${base}ing`], `После must вставьте форму ${base}.`, 'must', 'Must не требует to и не изменяется по лицам.', base);
        break;
      case '8_2':
        for (const [subject, time] of [[n, 'yesterday'], ['We', 'last weekend'], ['My cousin', 'two days ago']]) {
          add(`${subject} ___ ${object} ${time}.`, past, [base, third, `${base}ed`, `did ${past}`], `Past Simple: поставьте ${base} в нужную форму.`, past.endsWith('ed') ? 'regular' : 'irregular', `Прошедшая форма ${base} — ${past}.`, base);
        }
        break;
      case '8_3':
        add(`Did ${n} ___ ${object} yesterday?`, base, [past, third, `${base}ed`, `to ${base}`], `Вставьте форму ${base}.`, 'question-base', 'После did используется начальная форма глагола.', base);
        add(`We didn't ___ ${object} last week.`, base, [past, third, `${base}ed`, `to ${base}`], `Вставьте форму ${base}.`, 'negative-base', 'После didn’t используется начальная форма глагола.', base);
        add(`___ they ${inf} yesterday?`, 'Did', ['Do', 'Does', 'Were'], 'Вставьте помощник для вопроса в Past Simple.', 'auxiliary', 'Вопрос с действием в Past Simple строится с did.', base);
        break;
      case '8_4':
        if (past.endsWith('ed')) break;
        add(`${base} → ___ → ${participle}`, past, [base, third, `${base}ed`, participle], 'Вставьте вторую форму неправильного глагола (V2).', 'v2', `${base} — ${past} — ${participle}.`, base);
        add(`${base} → ${past} → ___`, participle, [base, third, `${base}ed`, past], 'Вставьте третью форму неправильного глагола (V3).', 'v3', `${base} — ${past} — ${participle}.`, base);
        add(`${n} ___ ${object} yesterday.`, past, [base, third, `${base}ed`, participle], `Вставьте V2 глагола ${base}.`, 'context', `В Past Simple используется V2: ${past}.`, base);
        break;
    }
  });
  if (lesson === '8_4') {
    for (const [base, past, participle, russian] of VERBS) {
      const alternatives = (answer: string) => [base + 's', base + 'ing', base + 'en', base + 't'].filter(value => !answer.split('/').includes(value));
      add(`${base} (${russian}): V2 = ___`, past, alternatives(past), 'Вставьте вторую форму. Если в таблице несколько вариантов, подойдёт любой.', 'v2', `${base} — ${past} — ${participle}.`, base);
      add(`${base} (${russian}): V3 = ___`, participle, alternatives(participle), 'Вставьте третью форму. Если в таблице несколько вариантов, подойдёт любой.', 'v3', `${base} — ${past} — ${participle}.`, base);
    }
  }
  materials.forEach(word => {
    if (lesson === '3_1') {
      add(`The ___ is important to us.`, word, [`${word}s`, `a ${word}`, `an ${word}`], `Вставьте ${word} как неисчисляемое существительное.`, 'uncountable', `${word} в этом значении неисчисляемое: без a/an и окончания множественного числа.`, word);
      add(`This ${word} ___ useful.`, 'is', ['are', 'am', 'be'], 'Согласуйте to be с неисчисляемым существительным.', 'uncountable-agreement', 'Неисчисляемое существительное согласуется с is.', word);
    }
    if (lesson === '6_3') {
      add(`How ___ ${word} do we need?`, 'much', ['many', 'a few', 'a little'], 'Вставьте much или many.', 'uncountable', 'Much используется с неисчисляемыми существительными.', word);
      add(`We have ___ ${word}, just enough for now.`, 'a little', ['a few', 'many', 'an'], 'Вставьте a few или a little.', 'small-uncountable', 'A little — небольшое количество неисчисляемого.', word);
      add(`We have ___ ${word}.`, 'a lot of', ['many', 'a few', 'an'], 'Вставьте a lot of, чтобы выразить большое количество.', 'large', 'A lot of употребляется и с исчисляемыми, и с неисчисляемыми существительными.', word);
    }
    if (lesson === '6_2') {
      add(`Could you give me ___ ${word}, please?`, 'some', ['no', 'a', 'an'], 'Вежливая просьба о некотором количестве: вставьте some.', 'request', 'В просьбах, когда ожидают положительный ответ, используется some.', word);
      add(`We don't have ___ ${word} left.`, 'any', ['some', 'no', 'an'], 'Вставьте some/any/no.', 'negative', 'В отрицании с don’t употребляется any.', word);
    }
  });
  if (lesson === '5_1' || lesson === '5_3') {
    const expressions = lesson === '5_1'
      ? ['in|January', 'in|February', 'in|March', 'in|April', 'in|May', 'in|June', 'in|July', 'in|August', 'in|September', 'in|October', 'in|November', 'in|December', 'in|summer', 'in|winter', 'in|spring', 'in|autumn', 'on|Monday', 'on|Tuesday', 'on|Wednesday', 'on|Thursday', 'on|Friday', 'on|Saturday', 'on|Sunday', 'at|noon', 'at|midnight', 'at|sunrise', 'at|sunset', 'at|six o’clock', 'at|half past nine', 'in|the morning', 'in|the afternoon', 'in|the evening']
      : ['at|home', 'at|work', 'at|school', 'at|university', 'in|bed', 'in|hospital', 'in|prison', 'at|sea', 'on|holiday', 'on|duty', 'on|a business trip', 'in|a hurry', 'on|time', 'in|trouble', 'in|danger', 'at|peace', 'on|a break', 'at|lunch', 'at|breakfast', 'at|dinner', 'on|the phone', 'on|the way', 'in|love', 'on|the move'];
    expressions.forEach(entry => {
      const [prep, phrase] = entry.split('|');
      for (const subject of lesson === '5_1' ? ['The workshop starts', 'Our next meeting is', 'The course begins', 'The exhibition opens'] : ['My colleague is', 'Our neighbour is', 'The manager is', 'My cousin is']) {
        add(`${subject} ___ ${phrase}.`, prep, ['in', 'on', 'at', 'to'], lesson === '5_1' ? 'Вставьте предлог времени in/on/at.' : 'Вставьте предлог в устойчивом выражении (британский английский).', prep, `Правильное сочетание: ${prep} ${phrase}.`, phrase);
      }
    });
    if (lesson === '5_3') {
      for (const vehicle of ['bus', 'train', 'car', 'plane', 'boat', 'bike', 'taxi', 'tram']) {
        add(`We usually travel ___ ${vehicle}.`, 'by', ['on', 'in', 'at'], 'Способ передвижения без артикля: вставьте предлог.', 'transport', `Без артикля используется by ${vehicle}.`, vehicle);
      }
      add('We usually go there ___ foot.', 'on', ['by', 'in', 'at'], 'Вставьте предлог в выражении «пешком».', 'foot', 'Устойчивое выражение: on foot.', 'foot');
      add('The streets are quiet ___ night.', 'at', ['in', 'on', 'by'], 'Вставьте предлог в выражении «ночью».', 'night', 'Устойчивое выражение: at night.', 'night');
    }
  }
  // Same text may have different teaching cues (e.g. this/that); retain each meaning.
  return items.map(item => ({ ...item, key: `${item.sentence}|${item.answer}|${item.cue}` }));
}
