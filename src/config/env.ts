import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  DISCORD_WEBHOOK_URL: z.string().optional(),
  
  BOT_MODE: z.literal('paper'),
  DATA_SOURCE_MODE: z.enum(['rest', 'mock']),
  ENABLE_MOCK_REALTIME: z.string().transform((v) => v === 'true').optional().default('false'),

  SCAN_INTERVAL_SECONDS: z.coerce.number().positive(),
  PRICE_UPDATE_INTERVAL_SECONDS: z.coerce.number().positive(),
  METRICS_INTERVAL_MINUTES: z.coerce.number().positive(),

  MIN_LIQUIDITY_USD: z.coerce.number().positive(),
  MIN_VOLUME_5M_USD: z.coerce.number().positive(),
  MIN_BUY_RATIO: z.coerce.number().min(0).max(1),
  MIN_MARKET_CAP_USD: z.coerce.number().positive(),
  MAX_MARKET_CAP_USD: z.coerce.number().positive(),
  RISK_MAX_ALLOWED_LEVEL: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EXTREME']),
  RISK_MIN_PAIR_AGE_MINUTES: z.coerce.number().nonnegative(),
  UNKNOWN_ONCHAIN_CHECK_PENALTY: z.coerce.number().nonnegative(),

  VIRTUAL_STARTING_BALANCE_USD: z.coerce.number().positive(),
  VIRTUAL_POSITION_SIZE_USD: z.coerce.number().positive(),
  MAX_OPEN_POSITIONS: z.coerce.number().int().positive(),

  SLIPPAGE_MODEL: z.enum(['FIXED', 'AMM_CONSTANT_PRODUCT']),
  SIMULATED_BUY_SLIPPAGE_PERCENT: z.coerce.number().nonnegative(),
  SIMULATED_SELL_SLIPPAGE_PERCENT: z.coerce.number().nonnegative(),
  SIMULATED_FEE_PERCENT: z.coerce.number().nonnegative(),

  STOP_LOSS_PERCENT: z.coerce.number().nonnegative(),
  TAKE_PROFIT_PERCENT: z.coerce.number().nonnegative(),
  TRAILING_STOP_PERCENT: z.coerce.number().nonnegative(),
  MAX_HOLD_MINUTES: z.coerce.number().positive(),
  PRICE_STALE_MINUTES: z.coerce.number().positive(),
  PROCESSED_TOKEN_TTL_MINUTES: z.coerce.number().positive(),

  DEXSCREENER_MAX_TOKENS_PER_SCAN: z.coerce.number().int().positive(),
  DEXSCREENER_REQUEST_TIMEOUT_MS: z.coerce.number().positive(),
  DEXSCREENER_MAX_RETRIES: z.coerce.number().nonnegative(),
  DEXSCREENER_PROFILE_MIN_REQUEST_INTERVAL_MS: z.coerce.number().nonnegative(),
  DEXSCREENER_PAIR_MIN_REQUEST_INTERVAL_MS: z.coerce.number().nonnegative(),

  LOG_LEVEL: z.string().default('info')
}).refine(data => data.MIN_MARKET_CAP_USD <= data.MAX_MARKET_CAP_USD, {
  message: "MIN_MARKET_CAP_USD cannot be greater than MAX_MARKET_CAP_USD",
  path: ["MIN_MARKET_CAP_USD"],
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
