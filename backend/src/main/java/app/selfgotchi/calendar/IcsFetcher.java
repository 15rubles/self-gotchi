package app.selfgotchi.calendar;

import java.io.IOException;
import java.io.InputStream;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.springframework.stereotype.Component;

import app.selfgotchi.common.ValidationException;

/**
 * Downloads a published calendar link (Google "secret address in iCal format", Outlook
 * "publish calendar", iCloud "public calendar"). Browsers can't read those links directly
 * (no CORS), so the server fetches them, carefully: https only (webcal:// is rewritten), no
 * addresses inside the local network (checked again on every redirect), {@value #MAX_BYTES}
 * bytes at most, short timeouts.
 */
@Component
public class IcsFetcher {

    static final int MAX_BYTES = 5 * 1024 * 1024;
    private static final int MAX_REDIRECTS = 3;

    private final HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .followRedirects(HttpClient.Redirect.NEVER)
        .build();

    public String fetch(String link) {
        URI uri = parse(link);
        try {
            for (int hop = 0; hop <= MAX_REDIRECTS; hop++) {
                checkHost(uri);
                HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(20))
                    .header("Accept", "text/calendar, */*")
                    .GET()
                    .build();
                HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
                int status = response.statusCode();
                if (status >= 300 && status < 400) {
                    String location = response.headers().firstValue("Location")
                        .orElseThrow(() -> new ValidationException("url", "the calendar link redirects nowhere"));
                    response.body().close();
                    uri = parse(uri.resolve(location).toString());
                    continue;
                }
                if (status != 200) {
                    response.body().close();
                    throw new ValidationException("url", "the calendar link answered HTTP " + status
                        + (status == 404 || status == 403 ? " (is the link still shared?)" : ""));
                }
                try (InputStream body = response.body()) {
                    byte[] bytes = body.readNBytes(MAX_BYTES + 1);
                    if (bytes.length > MAX_BYTES) {
                        throw new ValidationException("url", "the calendar is larger than 5 MB");
                    }
                    return new String(bytes, StandardCharsets.UTF_8);
                }
            }
            throw new ValidationException("url", "the calendar link redirects too often");
        } catch (IOException e) {
            throw new ValidationException("url", "couldn't download the calendar (" + e.getClass().getSimpleName() + ")");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ValidationException("url", "the download was interrupted");
        }
    }

    /** https only; webcal:// (what Apple and Outlook often hand out) means https. */
    static URI parse(String link) {
        String trimmed = link == null ? "" : link.strip();
        if (trimmed.regionMatches(true, 0, "webcal://", 0, 9)) {
            trimmed = "https://" + trimmed.substring(9);
        }
        URI uri;
        try {
            uri = URI.create(trimmed);
        } catch (IllegalArgumentException e) {
            throw new ValidationException("url", "isn't a valid link");
        }
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
            throw new ValidationException("url", "must be an https:// or webcal:// calendar link");
        }
        return uri;
    }

    /** Refuses hosts that resolve to this machine or the local network. */
    static void checkHost(URI uri) {
        InetAddress[] addresses;
        try {
            addresses = InetAddress.getAllByName(uri.getHost());
        } catch (UnknownHostException e) {
            throw new ValidationException("url", "the calendar's server " + uri.getHost() + " wasn't found");
        }
        for (InetAddress address : addresses) {
            if (isPrivate(address)) {
                throw new ValidationException("url", "links to this computer or your local network aren't allowed");
            }
        }
    }

    static boolean isPrivate(InetAddress a) {
        if (a.isAnyLocalAddress() || a.isLoopbackAddress() || a.isLinkLocalAddress() || a.isSiteLocalAddress()
            || a.isMulticastAddress()) {
            return true;
        }
        byte[] b = a.getAddress();
        if (a instanceof Inet6Address) {
            return (b[0] & 0xfe) == 0xfc; // unique local fc00::/7
        }
        int first = b[0] & 0xff;
        int second = b[1] & 0xff;
        return first == 0 || (first == 100 && second >= 64 && second <= 127) // carrier-grade NAT
            || (first == 169 && second == 254);
    }
}
