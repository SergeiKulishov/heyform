import { Auth } from '@decorator'
import { UNSPLASH_CLIENT_ID } from '@environments'
import { UnsplashImageType, UnsplashSearchInput } from '@graphql'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { Unsplash } from '@utils'
import { randomNumber } from '@utils'
import { helper } from '@voxly/utils'

@Resolver()
@Auth()
export class UnsplashSearchResolver {
  @Query(returns => [UnsplashImageType])
  async unsplashSearch(@Args('input') input: UnsplashSearchInput): Promise<UnsplashImageType[]> {
    let page = input.page || 1
    let query = input.keyword

    if (helper.isEmpty(query)) {
      query = 'hd wallpapers'
      page = randomNumber(1, 200)
    }

    const unsplash = Unsplash.init({
      clientId: UNSPLASH_CLIENT_ID
    })
    const result = await unsplash.search(query, page)

    return result.results.map(row => ({
      id: row.id,
      url: row.urls.regular,

      downloadUrl: row.links.download_location,
      thumbUrl: row.urls.thumb,
      author: row.user.name,
      authorUrl: row.user.links.html
    }))
  }
}
