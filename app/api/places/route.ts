type NaverPlace = {
  title: string;
  link: string;
  category: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
};

type NaverSearchResponse = {
  items?: NaverPlace[];
};

function naverErrorMessage(status: number) {
  if (status === 401) return "NAVER API HUB 인증 정보를 확인해 주세요.";
  if (status === 403)
    return "NAVER API HUB에서 지역 검색 API가 선택되어 있는지 확인해 주세요.";
  if (status === 429)
    return "장소 검색 요청 한도를 초과했어요. 잠시 후 다시 시도해 주세요.";
  return "장소 검색 결과를 불러오지 못했어요.";
}

function plainText(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2) return Response.json({ places: [] });

  const clientId = process.env.NAVER_API_HUB_CLIENT_ID;
  const clientSecret = process.env.NAVER_API_HUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return Response.json(
      { error: "장소 검색 API 인증 정보가 설정되지 않았어요." },
      { status: 503 },
    );
  }

  const endpoint = new URL(
    "https://naverapihub.apigw.ntruss.com/search/v1/local",
  );
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("display", "5");
  endpoint.searchParams.set("start", "1");
  endpoint.searchParams.set("sort", "random");
  endpoint.searchParams.set("format", "json");

  const response = await fetch(endpoint, {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("[places] NAVER API HUB request failed", {
      status: response.status,
    });
    return Response.json(
      { error: naverErrorMessage(response.status) },
      { status: response.status },
    );
  }

  const payload = (await response.json()) as NaverSearchResponse;
  const places = (payload.items ?? []).map((place) => {
    const name = plainText(place.title);
    return {
      id: [place.mapx, place.mapy, place.address, name].join(":"),
      name,
      address: place.address,
      roadAddress: place.roadAddress,
      category: place.category,
    };
  });

  return Response.json({ places });
}
