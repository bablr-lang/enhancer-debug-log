/* global console */

import { mapProductions } from '@bablr/helpers/enhancers';
import { getCooked } from '@bablr/helpers/token';
import { printSource } from '@bablr/agast-helpers/tree';

export const enhanceGrammarWithDebugLogging = (grammar, indentation = '') => {
  return mapProductions((production, type) => {
    return function* (...args) {
      const indent = (strings, ...args) => {
        return `${indentation}${String.raw(strings, ...args)}`;
      };

      console.log(`--> ${type}`);

      let earlyReturn = true;
      try {
        const generator = production(...args);
        let current = generator.next();

        let anyResult = false;

        while (!current.done) {
          const instr = current.value;

          console.log(indent`${printSource(instr)}`);

          const eats =
            instr.type === 'Call' && ['eat', 'eatMatch'].includes(getCooked(instr.properties.verb));

          const result = yield instr;

          anyResult = anyResult || (eats && result);

          current = generator.next(result);
        }

        if (anyResult) {
          console.log(`<-- ${type}`);
        } else {
          console.log(`x-- ${type}`);
        }
        earlyReturn = false;

        return current.value;
      } finally {
        if (earlyReturn) {
          console.log(`x-- ${type}`);
        }
      }
    };
  }, grammar);
};

export const enhanceLanguageWithDebugLogging = (language, indentation = '') => {
  return {
    ...language,
    grammar: enhanceGrammarWithDebugLogging(language.grammar, indentation),
  };
};

export const enhanceWithDebugLogging = enhanceLanguageWithDebugLogging;

export default enhanceWithDebugLogging;
