import {validateReading} from './core.mjs';
export const QUESTION_LIMIT=140;
const focus={
  zh:'\n[逐牌说明元素、数字／宫廷角色、黄金黎明占星对应如何影响解读，并分析相互关系。]',
  en:'\n[Each: elements, numbers/courts, Golden Dawn astrology.]',
};
// A reading preference inside the existing question field, never a custom
// system prompt. The original question in the UI/journal/export stays intact.
export function prepareAIReading(raw){
  const reading=validateReading(raw);
  if(reading.question.length>QUESTION_LIMIT)throw new RangeError('QUESTION_LENGTH');
  const question=reading.question+focus[reading.language];
  return validateReading({...reading,question});
}
