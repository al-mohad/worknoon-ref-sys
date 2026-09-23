import { Injectable } from '@nestjs/common';

/**
 * Every place that needs "now" asks this instead of calling `new Date()`
 * directly, so the policy engine and workflow tests can pin time without
 * mocking globals.
 */
@Injectable()
export class Clock {
  now(): Date {
    return new Date();
  }
}
