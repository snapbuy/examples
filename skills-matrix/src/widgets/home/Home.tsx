import { icache } from '@dojo/framework/core/middleware/icache';
import { create, tsx } from '@dojo/framework/core/vdom';
import Icon from '@dojo/widgets/icon';
import TextArea from '@dojo/widgets/text-area';
import TwoColumLayout from '@dojo/widgets/two-column-layout';

import router from '../../middleware/router';
import { store } from '../../middleware/store';
import { loadAssessment, newAssessment } from '../../processes/assessment.processes';
import { loadAssessments } from '../../processes/assessments.processes';
import { RouteName } from '../../routes';
import { cleanCopyUrl } from '../../util/clipboard';
import { resumeHash } from '../../util/persistence';
import { createHash, isSkillHash } from '../../util/skills';
import Button from '../button/Button';
import TextInput from '../text-input/TextInput';
import * as css from './Home.m.css';

const factory = create({ icache, router, store });

export const Home = factory(function ({
	middleware: {
		icache,
		router,
		store: { get, path, executor }
	}
}) {
	const person = icache.getOrSet('person', () => {
		const storeValue = get(path('skills', 'hash'));
		const persistedValue = resumeHash();
		return storeValue || persistedValue;
	});
	const hashes = icache.getOrSet(
		'hashes',
		get(path('compare', 'assessments'))
			.map((assessment) => createHash(assessment, get(path('matrixVersion'))))
			.join('\n')
	);
	const isPersonHash = isSkillHash(person);

	const editProfile = async () => {
		const value = icache.get<string>('person') || '';
		const cleanValue = cleanCopyUrl(value);

		const { error } = isSkillHash(value)
			? await executor(loadAssessment)({ hash: cleanValue })
			: await executor(newAssessment)({ name: cleanValue });

		if (error) {
			console.error(error);
		} else {
			router().go(RouteName.Skills, {});
		}
	};

	const leading = (
		<div classes={css.columnContent}>
			<h1 classes={css.heading}>
				<Icon
					classes={{
						'@dojo/widgets/icon': {
							icon: [css.icon]
						}
					}}
					type="plusIcon"
				/>
				Create New / Edit Existing
			</h1>
			<div classes={css.textInput}>
				<TextInput
					onValue={(value) => icache.set('person', value)}
					onKeyUp={(code) => {
						code === 13 && editProfile();
					}}
					placeholder="Enter name or hash..."
					initialValue={person}
					label="Full name or existing hash"
				/>
			</div>
			<Button onClick={() => editProfile()} disabled={!person}>
				{isPersonHash ? 'Edit Hash' : 'Create New'}
			</Button>
		</div>
	);

	const trailing = (
		<div classes={css.columnContent}>
			<h1 classes={css.heading}>
				<Icon
					classes={{
						'@dojo/widgets/icon': {
							icon: [css.icon]
						}
					}}
					type="searchIcon"
				/>
				Compare Profiles
			</h1>
			<TextArea
				classes={{
					'@dojo/widgets/text-area': {
						input: [css.textArea],
						inputWrapper: [css.wrapper]
					}
				}}
				initialValue={hashes}
				onValue={(value) => icache.set('hashes', value)}
				placeholder="Enter comma-separated hashes..."
			></TextArea>
			<Button
				disabled={!hashes}
				onClick={async () => {
					const value = icache.get<string>('hashes') || '';
					const hashes = value
						.replace(/(\n+|\,+|\s+)/g, '\n')
						.split('\n')
						.filter((value) => value.length > 0)
						.map((value) => cleanCopyUrl(value).trim());

					const { error } = await executor(loadAssessments)({ hashes });
					!error && router().go(RouteName.Compare, {});
				}}
			>
				Compare
			</Button>
		</div>
	);

	return (
		<div classes={css.root}>
			<div classes={css.divider}>OR</div>
			<TwoColumLayout
				classes={{
					'@dojo/widgets/two-column-layout': {
						root: [css.layoutRoot],
						column: [css.column]
					}
				}}
			>
				{{
					leading,
					trailing
				}}
			</TwoColumLayout>
		</div>
	);
});
