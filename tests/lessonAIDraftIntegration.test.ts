import assert from 'node:assert/strict';
import test from 'node:test';
import type { AIGeneratedBlockDraft, LessonBlock } from '../src/types';
import {
  insertApprovedBlocksAsDraft,
  replaceApprovedBlockAsDraft,
  selectAcceptedBlocks,
  type LessonAIDraftGateway,
} from '../src/services/lessonAIDraftIntegration';

const generated: AIGeneratedBlockDraft[] = [
  { type: 'heading', titleAr: 'عنوان', titleEn: 'Heading', payload: { text: 'One' } },
  { type: 'vocabulary', titleAr: 'مفردات', titleEn: 'Vocabulary', payload: { text: 'Two' } },
  { type: 'exercise', titleAr: 'تدريب', titleEn: 'Practice', payload: { text: 'Three' } },
];

test('review accepts selected blocks in order and inserts draft content only', async () => {
  const calls: Array<{ lessonId: string; blocks: AIGeneratedBlockDraft[]; position: number }> = [];
  const gateway: LessonAIDraftGateway = {
    async insertDraftBlocks(lessonId, blocks, position) {
      calls.push({ lessonId, blocks, position });
      return blocks.map((block, index) => ({ id: `new-${index}`, lessonId, type: block.type, titleAr: block.titleAr, titleEn: block.titleEn, payload: block.payload, orderIndex: position + index, status: 'draft' }));
    },
    async updateBlock() { throw new Error('not used'); },
  };
  const accepted = selectAcceptedBlocks(generated, new Set([0, 2]));
  const inserted = await insertApprovedBlocksAsDraft(gateway, 'lesson-1', accepted, 1);
  assert.deepEqual(calls[0].blocks.map((item) => item.type), ['heading', 'exercise']);
  assert.equal(calls[0].position, 1);
  assert.ok(inserted.every((item) => item.status === 'draft'));
  assert.ok(inserted.every((item) => item.status !== 'published'));
});

test('approved rewrite replaces only the selected block as draft', async () => {
  let updatedId = '';
  let updated: Partial<LessonBlock> = {};
  const gateway: LessonAIDraftGateway = {
    async insertDraftBlocks() { throw new Error('not used'); },
    async updateBlock(id, changes) {
      updatedId = id; updated = changes;
      return { id, lessonId: 'lesson-1', orderIndex: 4, titleAr: changes.titleAr!, titleEn: changes.titleEn, type: changes.type!, payload: changes.payload!, status: changes.status! };
    },
  };
  await replaceApprovedBlockAsDraft(gateway, 'selected-block', generated[1]);
  assert.equal(updatedId, 'selected-block');
  assert.equal(updated.status, 'draft');
  assert.equal(updated.type, 'vocabulary');
});
