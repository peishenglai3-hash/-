/*
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-11 10:22:29
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-13 09:43:16
 * @FilePath: /honghu_game/src/types/director.d.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
export interface TransitionEntry {
	entry_id: string;
	kind: string;
	style: string;
	text: string;
	duration_ms: number;
	speaker_name?: string;
}

export interface TransitionCue {
	cue_id: string;
	at_entry: string;
	kind?: string;
}

export interface TransitionConfig {
	revealEntryId: string | null;
	revealImage: string | null;
	entries: TransitionEntry[];
	cues: TransitionCue[];
}
