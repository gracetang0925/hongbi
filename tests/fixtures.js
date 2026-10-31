export const session = 'e65049d2-2cc8-497a-bcf3-18a7b9336d75';
export const essay = '昨天我去公园，买了一个书。我和妈妈一起看书，我们过了快乐的一天。';
export const feedback = {
  macro: { summary: '你讲清楚了发生的事。', content: '补充一个细节。', structure: '顺序清楚。', coherence: '句子相连。',
    strengths: '写出了和妈妈的活动。', strengths_en: 'You shared what you did together.', encouragement: '试着再添一个细节。',
    scores: { accuracy: 7, fluency: 8, content: 8 } },
  micro: [{ type: '量词', type_en: 'Measure word', original: '一个书', correction: '一本书',
    explanation_zh: '书通常用“本”。', explanation_en: 'Use 本 for books.', pinyin: 'yì běn shū', pet_hint: '书要用什么量词呢？' }],
  practice: { focus: '量词', question_zh: '试着写一句你借书的话。', question_en: 'Write a sentence about borrowing a book.',
    hint_zh: '想想书的量词。', hint_en: 'Think of the measure word for books.', sample_answer: '我借了一本书。',
    explanation_zh: '一本书用了合适的量词。', explanation_en: '本 is the measure word for books.' },
};
export const record = { id: '1', session_id: session, student_name: '测试同学', essay, draft: 1, mode: 'teacher',
  status: 'pending', teacher_annotations: [], created_at: '2026-10-31T10:00:00Z', ai_feedback: '【宏观反馈】\n表达清楚' };
export const apiResult = { status: 'completed', model: 'gpt-5.6-terra', id: 'test_response',
  output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(feedback) }] }] };
