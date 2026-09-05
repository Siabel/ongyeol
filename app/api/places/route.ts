type KakaoPlace = {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  category_name: string;
};

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2) return Response.json({ places: [] });

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "장소 검색 API 키가 설정되지 않았어요." }, { status: 503 });
  }

  const endpoint = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("size", "7");
  endpoint.searchParams.set("sort", "accuracy");

  const response = await fetch(endpoint, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    cache: "no-store",
  });
  if (!response.ok) {
    return Response.json({ error: "장소 검색 결과를 불러오지 못했어요." }, { status: response.status });
  }

  const payload = await response.json() as { documents?: KakaoPlace[] };
  const places = (payload.documents ?? []).map((place) => ({
    id: place.id,
    name: place.place_name,
    address: place.address_name,
    roadAddress: place.road_address_name,
    category: place.category_name,
  }));
  return Response.json({ places });
}
