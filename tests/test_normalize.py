from datetime import datetime, timezone

from src.normalize import canonicalize_url, extract_domain, normalize_results


def test_strips_tracking_params_and_fragment():
    u = "http://www.Example.com/a/b/?utm_source=x&id=3&fbclid=abc#top"
    assert canonicalize_url(u) == "https://example.com/a/b?id=3"


def test_trailing_slash_and_scheme_equivalence():
    assert canonicalize_url("http://example.com/path/") == canonicalize_url("https://example.com/path")


def test_query_param_order_irrelevant():
    assert canonicalize_url("https://e.com/?b=2&a=1") == canonicalize_url("https://e.com/?a=1&b=2")


def test_domain_extraction():
    assert extract_domain("https://www.bbc.co.uk/news/x") == "bbc.co.uk"


def _raw(link, title="T", st="web"):
    return {"title": title, "link": link, "snippet": "s", "source_type": st, "date": None}


def test_dedup_and_sequential_ids():
    raw = [
        _raw("https://a.com/x?utm_medium=y"),
        _raw("http://www.a.com/x/"),
        _raw("https://b.com/z", st="news"),
    ]
    out = normalize_results(raw)
    assert [s.source_id for s in out] == ["S1", "S2"]
    assert out[1].source_type == "news"


def test_ids_continue_from_existing():
    t = datetime.now(timezone.utc)
    first = normalize_results([_raw("https://a.com/1")], retrieved_at=t)
    both = normalize_results([_raw("https://a.com/1"), _raw("https://c.com/2")], existing=first)
    assert [s.source_id for s in both] == ["S1", "S2"]
    assert both[0] is first[0]


def test_skips_results_missing_link_or_title():
    assert normalize_results([{"title": "", "link": "https://a.com"}, {"title": "x"}]) == []
