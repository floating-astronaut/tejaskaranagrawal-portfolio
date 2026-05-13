import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site } from '~/lib/site';
import type { APIContext } from 'astro';

export async function GET(context: APIContext): Promise<Response> {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  return rss({
    title: `${site.name} blog`,
    description: `Posts on production AI agents, MCP servers, voice AI, and the unit economics of agency-scale AI services.`,
    site: context.site ?? site.url,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.summary,
      pubDate: p.data.publishedAt,
      link: `/blog/${p.slug}/`,
      categories: p.data.tags,
    })),
    customData: '<language>en-us</language>',
  });
}
