function makeNotesArray() {
	return [
		{
			id: 1,
			title: 'Dogs',
			content:
				'Corporis accusamus placeat quas non voluptas. Harum fugit molestias qui. Velit ex animi reiciendis quasi. Suscipit totam delectus ut voluptas aut qui rerum. Non veniam eius molestiae rerum quam.\n \rUnde qui aperiam praesentium alias. Aut temporibus id quidem recusandae voluptatem ut eum. Consequatur asperiores et in quisquam corporis maxime dolorem soluta. Et officiis id est quia sunt qui iste reiciendis saepe. Ut aut doloribus minus non nisi vel corporis. Veritatis mollitia et molestias voluptas neque aspernatur reprehenderit.\n \rMaxime aut reprehenderit mollitia quia eos sit fugiat exercitationem. Minima dolore soluta. Quidem fuga ut sit voluptas nihil sunt aliquam dignissimos. Ex autem nemo quisquam voluptas consequuntur et necessitatibus minima velit. Consequatur quia quis tempora minima. Aut qui dolor et dignissimos ut repellat quas ad.',
			modified: '2021-01-17T23:20:18.000Z',
			folder_id: 1,
		},
		{
			id: 2,
			title: 'Cats',
			content:
				'Eos laudantium quia ab blanditiis temporibus necessitatibus. Culpa et voluptas ut sed commodi. Est qui ducimus id. Beatae sint aspernatur error ullam quae illum sint eum. Voluptas corrupti praesentium soluta cumque illo impedit vero omnis nisi.\n \rNam sunt reprehenderit soluta quis explicabo impedit id. Repudiandae eligendi libero ad ut dolores. Laborum nihil sint et labore iusto reiciendis cum. Repellat quos recusandae natus nobis ullam autem veniam id.\n \rEsse blanditiis neque tempore ex voluptate commodi nemo. Velit sapiente at placeat eveniet ut rem. Quidem harum ut dignissimos. Omnis pariatur quas aperiam. Quasi voluptas qui nulla. Iure quas veniam aut quia et.',
			modified: '2021-01-17T23:20:18.000Z',
			folder_id: 2,
		},
		{
			id: 3,
			title: 'Pigs',
			content:
				'Occaecati dignissimos quam qui facere deserunt quia. Quaerat aut eos laudantium dolor odio officiis illum. Velit vel qui dolorem et.\n \rQui ut vel excepturi in at. Ut accusamus cumque quia sapiente ut ipsa nesciunt. Dolorum quod eligendi qui aliquid sint.\n \rAt id deserunt voluptatem et rerum. Voluptatem fuga tempora aut dignissimos est odio maiores illo. Fugiat in ad expedita voluptas voluptatum nihil.',
			modified: '2021-01-17T23:20:18.000Z',
			folder_id: 3,
		},
	];
}

function makeMaliciousNote() {
	const maliciousNote = {
		id: 911,
		title: 'Naughty naughty very naughty <script>alert("xss");</script>',
		content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
        modified: new Date().toISOString(),
        folder_id: 1
	};
	const expectedNote = {
		...maliciousNote,
		title:
			'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;',
		content: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`,
	};
	return {
		maliciousNote,
		expectedNote,
	};
}

module.exports = {
	makeNotesArray,
	makeMaliciousNote,
};
