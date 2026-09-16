type KakaoPlace = {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  category_name: string;
};

type KakaoError = {
  code?: number;
  msg?: string;
};

function kakaoErrorMessage(status: number) {
  if (status === 401) return "Kakao REST API 키가 올바른지 확인해 주세요.";
  if (status === 403)
    return "Kakao Developers에서 로컬 API 사용 권한과 REST API 키의 호출 허용 IP 설정을 확인해 주세요.";
  if (status === 429)
    return "장소 검색 요청 한도를 초과했어요. 잠시 후 다시 시도해 주세요.";
  return "장소 검색 결과를 불러오지 못했어요.";
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2) return Response.json({ places: [] });

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "장소 검색 API 키가 설정되지 않았어요." },
      { status: 503 },
    );
  }

  const endpoint = new URL(
    "https://dapi.kakao.com/v2/local/search/keyword.json",
  );
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("size", "7");
  endpoint.searchParams.set("sort", "accuracy");

  const response = await fetch(endpoint, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const errorPayload = (await response
      .json()
      .catch(() => ({}))) as KakaoError;
    console.error("[places] Kakao Local API request failed", {
      status: response.status,
      code: errorPayload.code ?? null,
    });
    return Response.json(
      {
        error: kakaoErrorMessage(response.status),
        code: errorPayload.code ?? null,
      },
      { status: response.status },
    );
  }

  const payload = (await response.json()) as { documents?: KakaoPlace[] };
  const places = (payload.documents ?? []).map((place) => ({
    id: place.id,
    name: place.place_name,
    address: place.address_name,
    roadAddress: place.road_address_name,
    category: place.category_name,
  }));
  return Response.json({ places });
}
