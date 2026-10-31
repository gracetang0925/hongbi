// Hand-written fictional examples. Never import production configuration here.
const bilingual = (zh, en) => ({ zh, en });
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const NOTE_TYPES = freeze({
  '逻辑': bilingual('内容与逻辑', 'Content & logic'),
  '语用': bilingual('表达与语用', 'Expression & pragmatics'),
  '文化': bilingual('文化与语境', 'Culture & context'),
  '鼓励': bilingual('具体表扬', 'Specific praise'),
  '其他': bilingual('其他', 'Other'),
});

export const SAMPLE_SUBMISSIONS = freeze([
  {
    id: 'sample-park', learner: 'Demo A', status: 'pending', mode: 'hybrid',
    title: bilingual('公园里的小发现', 'A little discovery in the park'),
    essay: '星期天，我和爸爸去公园。天气很晴，我看见很多鸟在树上唱歌。\n我带了一个面包，想给小鸟吃。爸爸说，面包不适合小鸟。我们把面包收起来，坐在椅子上看它们。\n回家的时候，我觉得很开心。下次我想带一本鸟的书，看看它们叫什么名字。',
    strength: bilingual('从“想喂鸟”到“观察鸟”，故事里有一个清楚的变化。', 'The story has a clear change: wanting to feed the birds, then choosing to observe them.'),
    focus: bilingual('结尾的“开心”可以更具体：这次发现让你学到了什么？', 'Make “happy” more specific in the ending: what did this discovery teach you?'),
    language: bilingual('“天气很晴”意思清楚。可以再观察中文里怎样描述晴天。', '“天气很晴” is understandable. Explore how sunny weather is usually described in Chinese.'),
    notes: [],
  },
  {
    id: 'sample-letter', learner: 'Demo B', status: 'draft', mode: 'teacher',
    title: bilingual('给朋友的一封信', 'A letter to a friend'),
    essay: '小安：\n你好！你搬家以后，我们班很想你。上星期运动会，我们一起给队员加油。虽然没有拿第一名，但是大家都很努力。\n你必须这个星期六来我家。我们可以一起做饺子，也可以看看以前的照片。\n祝你天天开心！\n你的朋友',
    strength: bilingual('运动会和旧照片让这封信有了具体的共同回忆。', 'The sports day and old photos give the letter a concrete sense of shared memories.'),
    focus: bilingual('邀请朋友时，怎样让对方感到可以自由选择？', 'How could an invitation give your friend room to choose?'),
    language: bilingual('留意“必须”的语气，比较要求和邀请的区别。', 'Notice the tone of “必须” and compare a demand with an invitation.'),
    notes: [{ type: '语用', quote: '你必须这个星期六来我家。', text: '你想邀请好朋友，心情写得很真切。试着用一个让朋友可以选择的问句。 / Try a question that gives your friend a choice.' }],
  },
  {
    id: 'sample-help', learner: 'Demo C', status: 'returned', mode: 'hybrid',
    title: bilingual('一次小小的帮助', 'A small act of help'),
    essay: '昨天放学的时候，下起了大雨。我在门口看见一个同学。他没有带伞，一直看着天空。\n我走过去问他，要不要和我一起走。我们走得很慢，因为伞有一点小。我的书包湿了，但是他笑着对我说谢谢。\n到了路口，我们挥手再见。我觉得帮助别人不一定要做很大的事情。',
    strength: bilingual('小伞、湿书包和挥手再见，让读者看见帮助发生的过程。', 'The small umbrella, wet bag, and goodbye show how the act of help unfolded.'),
    focus: bilingual('可以补上开口邀请前的一个想法，让人物心情更清楚。', 'Add a thought before the invitation to make the narrator’s feelings clearer.'),
    language: bilingual('时间线清楚，适合再练习用动作和细节表达感受。', 'The sequence is clear. Keep practising how actions and details convey feelings.'),
    notes: [{ type: '鼓励', quote: '我的书包湿了，但是他笑着对我说谢谢。', text: '你用一个小细节写出了帮助别人的感受，读者能够想象那个场景。 / This detail helps the reader picture the moment.' }],
  },
]);

export function createDemoSubmissions() { return structuredClone(SAMPLE_SUBMISSIONS); }

export function filterDemoSubmissions(items, query = '', status = 'all') {
  const needle = query.trim().toLocaleLowerCase();
  return items.filter(item => (status === 'all' || item.status === status) &&
    [item.learner, item.title.zh, item.title.en, item.essay].join(' ').toLocaleLowerCase().includes(needle));
}

export function saveDemoReview(items, id, notes, returned = false) {
  const current = items.find(item => item.id === id);
  if (!current) throw new Error('submission');
  if (!Array.isArray(notes) || notes.length > 20 || (returned && !notes.length)) throw new Error('notes');
  const clean = notes.map(note => {
    if (!note || !Object.hasOwn(NOTE_TYPES, note.type) || typeof note.text !== 'string' ||
      !note.text.trim() || note.text.length > 1000 || typeof note.quote !== 'string' ||
      note.quote.length > 400 || (note.quote && !current.essay.includes(note.quote))) throw new Error('annotation');
    return { type: note.type, quote: note.quote, text: note.text.trim() };
  });
  return items.map(item => item.id === id ? { ...item, notes: clean,
    status: returned || item.status === 'returned' ? 'returned' : 'draft' } : item);
}
