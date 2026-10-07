// @story #136
import { createGrantRequester } from '../../src/authority/challenge.mjs';
import { readReview, mutateReview } from './protocol-api.mjs';
export const requestGrant = createGrantRequester({ readReview, mutateReview });
