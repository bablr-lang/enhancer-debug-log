/* global console */

import { mapProductions } from '@bablr/helpers/enhancers';
import { printSource, getCooked } from '@bablr/agast-helpers/tree';

const mapProduction = (production, type, indentation) => {
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
};

export const enhanceGrammarWithDebugLogging = (grammar, indentation = '') => {
  return mapProductions((type, prod) => mapProduction(type, prod, indentation), grammar);
};

export const enhanceLanguageWithDebugLogging = (language, indentation = '') => {
  return {
    ...language,
    grammar: enhanceGrammarWithDebugLogging(language.grammar, indentation),
  };
};

export const enhanceWithDebugLogging = enhanceLanguageWithDebugLogging;

export const enhanceProductionWithDebugLogging = (indentation = '') => {
  return (production, type) => {
    return mapProduction(production, type, indentation);
  };
};

export default enhanceWithDebugLogging;
