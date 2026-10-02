import {validateAIInput as validateIChing,buildInterpretationPrompt as buildIChing} from '../iching/ai-prompt.mjs';
import {validateReading,buildTarotPrompt} from '../tarot/ai-prompt.mjs';
export const CAPABILITIES=Object.freeze(['iching','tarot']);
export const validateAIInput=input=>input?.kind==='tarot'?validateReading(input):validateIChing(input);
export const buildInterpretationPrompt=input=>input?.kind==='tarot'?buildTarotPrompt(input):buildIChing(input);
