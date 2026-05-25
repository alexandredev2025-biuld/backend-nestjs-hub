import org.traccar.helper.Hashing;
import java.security.SecureRandom;
public class HashGen {
    public static void main(String[] args) {
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        byte[] hash = Hashing.createPasswordHash(args[0], salt);
        System.out.println("salt=" + bytesToHex(salt));
        System.out.println("hash=" + bytesToHex(hash));
    }
    static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b & 0xff));
        return sb.toString();
    }
}
