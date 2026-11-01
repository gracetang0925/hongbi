import { handleRelay } from './relay.js';

Deno.serve(request => handleRelay(request));
