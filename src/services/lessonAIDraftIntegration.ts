import type { AIGeneratedBlockDraft, LessonBlock } from '../types';

export interface LessonAIDraftGateway {
  insertDraftBlocks(lessonId: string, blocks: AIGeneratedBlockDraft[], position: number): Promise<LessonBlock[]>;
  updateBlock(id: string, changes: Partial<LessonBlock>): Promise<LessonBlock>;
}

export const selectAcceptedBlocks = (
  blocks: AIGeneratedBlockDraft[],
  acceptedIndices: ReadonlySet<number>,
): AIGeneratedBlockDraft[] => blocks.filter((_, index) => acceptedIndices.has(index));

export const insertApprovedBlocksAsDraft = async (
  gateway: LessonAIDraftGateway,
  lessonId: string,
  blocks: AIGeneratedBlockDraft[],
  position: number,
): Promise<LessonBlock[]> => gateway.insertDraftBlocks(lessonId, blocks, position);

export const replaceApprovedBlockAsDraft = async (
  gateway: LessonAIDraftGateway,
  blockId: string,
  block: AIGeneratedBlockDraft,
): Promise<LessonBlock> => gateway.updateBlock(blockId, {
  type: block.type,
  titleAr: block.titleAr,
  titleEn: block.titleEn,
  payload: block.payload,
  status: 'draft',
});
