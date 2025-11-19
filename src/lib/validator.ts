import { sValidator } from '@hono/standard-validator';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import * as t from 'io-ts';
import { isLeft } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/PathReporter';
import { Env, ValidationTargets } from 'hono';

// Adapter to make io-ts codec compatible with Standard Schema
export function toStandardSchema<T extends t.Any>(codec: T): StandardSchemaV1<t.InputOf<T>, t.TypeOf<T>> {
    return {
        '~standard': {
            version: 1,
            vendor: 'io-ts-adapter',
            validate: (value: unknown) => {
                const result = codec.decode(value);
                if (isLeft(result)) {
                    return {
                        issues: PathReporter.report(result).map(msg => ({
                            message: msg,
                        })),
                    };
                }
                return { value: result.right };
            },
        },
    };
}

export const validate = <
    T extends t.Any,
    Target extends keyof ValidationTargets,
    E extends Env
>(
    target: Target,
    codec: T
) => {
    return sValidator(target, toStandardSchema(codec), (result, c) => {
        if (!result.success) {
            const issues = (result as any).error;
            return c.json(
                {
                    success: false,
                    error: 'Validation Error',
                    details: issues.map((i: any) => i.message),
                },
                400
            );
        }
    });
};
