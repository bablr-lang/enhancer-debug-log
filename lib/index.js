/* global console */

import { memoize, mapProductions } from '@bablr/helpers/enhancers';
import { getCooked } from '@bablr/helpers/token';
import { PathResolver } from '@bablr/helpers/path';

const print = (node) => {
  const resolver = new PathResolver(node);
  let printed = '';

  for (const child of node.children) {
    if (child.type === 'Literal' || child.type === 'Trivia') {
      printed += child.value;
    } else if (child.type === 'Escape') {
      printed += child.value.raw;
    } else if (child.type === 'Reference') {
      printed += print(resolver.get(child.value));
    }
  }

  return printed;
};

export const logGrammarEnhancer = (grammar) => {
  return mapProductions((production, type) => {
    return function* (...args) {
      const indent = (strings, ...args) => {
        const indentation = ' '.repeat(2);
        // const indentation = ' '.repeat((1 + state.depth) * 2);
        const content = String.raw(strings, ...args);
        return `${indentation}${content}`;
      };

      console.log(indent`--> ${type}`);

      let earlyReturn = true;
      try {
        const generator = production(...args);
        let current = generator.next();

        let anyResult = false;

        while (!current.done) {
          const instr = current.value;

          console.log(indent`${print(instr)}`);

          const eats =
            instr.type === 'Call' && ['eat', 'eatMatch'].includes(getCooked(instr.properties.verb));

          const result = yield instr;

          anyResult = anyResult || (eats && result);

          current = generator.next(result);
        }

        if (anyResult) {
          console.log(indent`<-- ${type}`);
        } else {
          console.log(indent`x-- ${type}`);
        }
        earlyReturn = false;
      } finally {
        if (earlyReturn) {
          console.log(indent`x-- ${type}`);
        }
      }
    };
  }, grammar);
};

export const logEnhancer = memoize((language) => {
  return {
    ...language,
    grammar: logGrammarEnhancer(language.grammar),
  };
});
