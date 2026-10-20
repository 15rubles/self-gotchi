package app.selfgotchi;

import java.util.ArrayList;
import java.util.List;

import app.selfgotchi.avatar.ImageGenerationException;
import app.selfgotchi.avatar.ImageGenerationProvider;

/** Stands in for OpenAI in integration tests: returns a tiny PNG and records each call. */
public class FakeImageProvider implements ImageGenerationProvider {

    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 0, 0, 0, 0};

    public record Call(String prompt, int references) {
    }

    public final List<Call> calls = new ArrayList<>();
    public boolean configured = true;
    /** Fail the call with this 1-based number (counting every call), or 0 for never. */
    public int failCall;

    public void reset() {
        calls.clear();
        configured = true;
        failCall = 0;
    }

    @Override
    public boolean isConfigured() {
        return configured;
    }

    @Override
    public Image edit(String prompt, List<Image> references) {
        calls.add(new Call(prompt, references.size()));
        if (calls.size() == failCall) {
            throw new ImageGenerationException("OpenAI answered HTTP 500: test failure");
        }
        return new Image(PNG.clone(), "image/png");
    }
}
