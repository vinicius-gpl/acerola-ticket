import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
	// feliz
	it('keeps the last value when two Tailwind classes collide', () => {
		expect(cn('px-2', 'px-6')).toBe('px-6');
	});

	// feliz
	it('lets a role radius win over the vendor radius that came before it', () => {
		expect(cn('rounded-md border', 'rounded-control')).toBe('border rounded-control');
		expect(cn('rounded-lg', 'rounded-chip')).toBe('rounded-chip');
	});

	// feliz
	it('lets a control step win over the height that came before it', () => {
		expect(cn('h-8', 'control-md')).toBe('control-md');
		expect(cn('h-9 px-2.5', 'control-lg')).toBe('control-lg');
	});

	// feliz
	it('lets an icon control step win over the square that came before it', () => {
		expect(cn('size-8', 'control-icon-lg')).toBe('control-icon-lg');
	});

	// triste
	it('keeps the width that came before a control step', () => {
		expect(cn('w-full', 'control-lg')).toBe('w-full control-lg');
	});

	// triste
	it('never lets a radius eat the control step', () => {
		expect(cn('control-lg rounded-control', 'rounded-full')).toBe('control-lg rounded-full');
	});

	// triste
	it('drops falsy values instead of writing "false" in the markup', () => {
		expect(cn('flex', false, undefined, null, 'gap-2')).toBe('flex gap-2');
	});
});
