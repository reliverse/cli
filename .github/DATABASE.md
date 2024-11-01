# Database

Relivator uses [Drizzle ORM](https://orm.drizzle.team) for database management. By default, the project uses [Neon](https://neon.tech) (Serverless) with [PostgreSQL](https://neon.tech/docs/postgresql/introduction) as the database provider. The project has already followed [Drizzle's guide](https://orm.drizzle.team/learn/tutorials/drizzle-with-neon) on how to set up Drizzle with Neon Postgres.

**August 4, 2024: Hot Update**:

If you use `neon` as your database provider, you no longer need `bun db:studio`; simply use Drizzle Studio on [Neon's website](https://neon.tech) 🎉

For development databases without important data, you can use `bun db:push`. For production databases containing important data, it is recommended to use `bun db:generate` followed by `bun db:migrate`.

> Drizzle Kit lets you alter you database schema and rapidly move forward with a [bun db:push](https://orm.drizzle.team/kit-docs/overview#prototyping-with-db-push) command. That’s very handy when you have remote databases like Neon, Planetscale or Turso. The 'push' command is ideal for quickly testing new schema designs or changes in a local development environment, allowing fast iterations without the overhead of managing migration files. © [Drizzle Team](https://orm.drizzle.team/learn/tutorials/drizzle-with-neon)

**Drizzle Team**: If you want to iterate quickly during local development or if your project doesn’t require migration files, Drizzle offers a useful command called drizzle-kit push. **When do you need to use the ‘push’ command?** **1.** During the prototyping and experimentation phase of your schema on a local environment. **2.** When you are utilizing an external provider that manages migrations and schema changes for you (e.g., PlanetScale). **3.** If you are comfortable modifying the database schema before your code changes can be deployed.

**Note**: NEXT_PUBLIC_DB_PROVIDER was removed in Relivator v1.2.6. To switch the provider from Neon, modify `drizzle.config.ts`. To use MySQL or LibSQL providers, update the files inside `src/db`. An automatic switcher is coming in Relivator version 1.3.x.

*The instructions below may be outdated, so please double-check them! We will fully update this README.md with the Relivator 1.3.0 release.*

Relivator is designed to effortlessly support both MySQL and PostgreSQL databases. While PostgreSQL and [Neon](https://neon.tech) are the default configurations, switching to MySQL provided by [Railway](https://railway.app?referralCode=sATgpf) or [PlanetScale](https://planetscale.com), or to PostgreSQL provided by [Railway](https://railway.app?referralCode=sATgpf) or [Vercel](https://vercel.com/storage/postgres) is straightforward. Adjust the database configuration inside [drizzle.config.ts](./drizzle.config.ts) and the `src/db/*` files accordingly. Although Relivator is optimized for these providers, other providers compatible with Drizzle and Auth.js (next-auth@beta/NextAuth.js) might also work with some additional setup. Full SQLite support is coming soon.

To set up the `DATABASE_URL` in the `.env` file, refer to `.env.example`. Initiate a new database or propagate schema changes by executing the `bun db:push` command. This ensures that all changes made to the schema files in `src/db/*` are mirrored in the selected database provider.

For database migrations, use the `bun db:generate` command, review the `drizzle` folder to ensure everything is correct, and run the `bun db:migrate` command when ready. If necessary, use `bun db:drop` to manage reversals in a controlled way.

If you used Relivator before v1.2.6, you may remove the `drizzle` folder inside the root directory. **Possible outdated information:** Do not manually delete files from the `drizzle` directory. Instead, use the [`bun db:drop` command](https://orm.drizzle.team/kit-docs/commands#drop-migration) if a migration needs to be reversed.

We ensure consistent database configuration by using the setup inside `drizzle.config.ts` and exporting configurations in `src/db/index.ts` and `src/db/schema/index.ts`. When selecting a database provider, comment out or remove unneeded providers in the `switch-case` of these files and remove related schema files as necessary. Additional adjustments in other files may also be required. An automatic switcher is coming soon in the Relivator v1.3.0 release.

**Historical context**: In Relivator v1.1.0, we aimed to provide simultaneous support for both MySQL and PostgreSQL for Drizzle ORM. In future releases, we plan to integrate Prisma ORM, making the project even more inclusive.
