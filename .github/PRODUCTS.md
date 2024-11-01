# Products

## Categories & Subcategories

To edit product categories, please refer to the `MySQL`, `PostgreSQL`, or `LibSQL` corresponding schema file in the `src/db/schema` folder.

After editing these files, don't forget to run `bun db:push` to apply the changes. Or run `bun generate` to create a sharable SQL, which another developers may apply with `bun migrate` to edit theirs database tables easily.

Then, simply update the category names and subcategories in the products file accordingly.
