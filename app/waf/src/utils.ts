/**
 * Copyright 2019 F5 Networks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {factory} from './log4ts';

const utilsLogger = factory.getLogger('utils.logger');

let defaultInterval = +process.env.DEFAULT_INTERVAL! || 1000;

export function getDefaultInterval(): number {
  return defaultInterval;
}

export function setDefaultInterval(ms: number) {
  if (ms > 0) {
    defaultInterval = ms;
  }
}

/**
 * Check and wait until some condition is fulfilled or timeout.
 *
 * @param checkFunc: a function which returns boolean.
 * @param tryTimes: times for wait.
 * @param funcArgs: array of any.
 * @param intervalInMSecs: interval in milli-seconds for sleeping between 2 tries.
 */
export async function checkAndWait(
  checkFunc: Function,
  tryTimes: number,
  funcArgs: (object | string | number | boolean | undefined)[] = [],
  intervalInMSecs: number = defaultInterval,
): Promise<void> {
  let funcName = checkFunc.name ? checkFunc.name : 'anonymous';

  utilsLogger.debug(
    `Check and wait '${funcName}' to response, countdown: ${tryTimes}.`,
  );
  if (tryTimes <= 0) {
    utilsLogger.error(`'${funcName}' timeout.`);
    return Promise.reject();
  }

  let hdlr = async (b: boolean | Error): Promise<boolean> => {
    utilsLogger.debug(
      `'${funcName}' response with ${b}, countdown: ${tryTimes}`,
    );
    if (typeof b === 'boolean' && b) return Promise.resolve(true);
    else throw new Error();
  };

  try {
    await checkFunc(...funcArgs).then(hdlr, hdlr);
    //await checkFunc(...funcArgs);
  } catch (error) {
    await sleep(intervalInMSecs);
    await checkAndWait(checkFunc, tryTimes - 1, funcArgs, intervalInMSecs);
  }
}

/**
 * sleep function
 *
 * @param milliSecs: milliseconds for the sleep.
 */
export async function sleep(milliSecs: number): Promise<void> {
  await new Promise(reslFunc => {
    setTimeout(reslFunc, milliSecs);
  });
}

/**
 * Merge two objects incursively.
 *
 * @param target: target object or undefined:
 *    if target is an object, merge sources into target, and return target.
 *    if target is undefined, merge sources, return the merged object.
 * @param sources: multiple sources for merging.
 *    if source[k]'s type is different with that of target[k], this function
 *    overwrites the target[k] with source[k].
 */
export function merge(
  target: object | undefined,
  ...sources: (object | undefined)[]
): object {
  if (typeof target !== 'object') target = {};
  let tobj = JSON.parse(JSON.stringify(target));

  for (let source of sources) {
    if (typeof source === 'undefined') continue;
    if (typeof source !== 'object')
      throw new Error(`Data is not mergeable: ${source}`);

    let sobj = JSON.parse(JSON.stringify(source));
    for (let k of Object.keys(sobj)) {
      if (
        tobj[k] &&
        typeof tobj[k] === 'object' &&
        typeof sobj[k] === 'object'
      ) {
        tobj[k] = merge(tobj[k], sobj[k]);
      } else {
        tobj[k] = sobj[k];
      }
    }
  }

  for (let t of Object.keys(tobj)) {
    // @ts-ignore: it must be an object.
    target[t] = tobj[t];
  }
  return target;
}
