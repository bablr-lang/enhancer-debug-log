/* global console */

import { printSource, getCooked } from '@bablr/agast-helpers/tree';
import { printType } from '@bablr/agast-helpers/print';

const { getOwnPropertyNames, hasOwn } = Object;

// TODO this lives in bablr-helpers but I can't use it there
//   it would create a circular dep at the module level
const mapProductions = (fn, Grammar) => {
  let { prototype } = Grammar;

  class MappedGrammar extends Grammar {}

  const mapped = MappedGrammar.prototype;

  while (prototype) {
    for (const key of getOwnPropertyNames(prototype)) {
      if (!hasOwn(mapped, key)) {
        mapped[key] = fn(prototype[key], key);
      }
    }
    ({ prototype } = prototype);
  }

  return MappedGrammar;
};

const mapProduction = (production, type, indentation, log) => {
  return function* (...args) {
    const indent = (strings, ...args) => {
      return `${indentation}${String.raw(strings, ...args)}`;
    };

    log(`--> ${printType(type)}`);

    let earlyReturn = true;
    try {
      const generator = production(...args);
      let current = generator.next();

      let anyResult = false;

      while (!current.done) {
        const instr = current.value;

        log(indent`${printSource(instr)}`);

        const eats =
          instr.type === 'Call' && ['eat', 'eatMatch'].includes(getCooked(instr.properties.verb));

        const result = yield instr;

        anyResult = anyResult || (eats && result);

        current = generator.next(result);
      }

      if (anyResult) {
        log(`<-- ${printType(type)}`);
      } else {
        log(`x-- ${printType(type)}`);
      }
      earlyReturn = false;

      return current.value;
    } finally {
      if (earlyReturn) {
        log(`x-- ${printType(type)}`);
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

export const enhanceProductionWithDebugLogging = (indentation = '', log = console.log) => {
  return (production, type) => {
    return mapProduction(production, type, indentation, log);
  };
};

export default enhanceWithDebugLogging;
