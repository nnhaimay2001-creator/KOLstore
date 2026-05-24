/**
 * n8n Code Node Script: Shopee Deep Link Generator
 * 
 * Script này nhận đầu vào là các hàng dữ liệu từ Google Sheets (đại diện bởi mảng $input.all()).
 * Nó sẽ duyệt qua từng sản phẩm ở trạng thái PENDING, kiểm tra `Original_Link`:
 * - Nếu là link rút gọn (shope.ee), gửi yêu cầu HTTP để lấy link đích cuối cùng.
 * - Sử dụng Regex thông minh để trích xuất shopId và productId.
 * - Tạo Deep Link dạng `shopeevn://product/{shopId}/{productId}` giúp tự động mở ứng dụng Shopee trên điện thoại.
 * 
 * Cách hoạt động trong n8n:
 * Đặt Node "Code" này ngay sau Google Sheets Trigger / Read Node.
 */

// Hàm phân giải link rút gọn (Follow redirect để lấy URL đích)
async function resolveShortLink(url) {
    if (!url) return '';
    
    // Kiểm tra xem có phải link rút gọn Shopee không
    if (url.includes('shope.ee') || url.includes('shp.ee') || url.includes('shorturl')) {
        try {
            // Sử dụng fetch gốc có sẵn trong Node.js 18+ của n8n
            // Gửi yêu cầu HEAD và đi theo các chuyển hướng (redirect: 'follow')
            const response = await fetch(url, {
                method: 'GET', // Một số server chặn HEAD, dùng GET cho chắc chắn
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                redirect: 'follow'
            });
            return response.url;
        } catch (error) {
            console.error(`Lỗi khi giải mã link rút gọn ${url}:`, error.message);
            return url; // Nếu lỗi, trả về link gốc làm fallback
        }
    }
    return url;
}

// Hàm trích xuất Shop ID và Product ID từ URL Shopee
function generateShopeeDeepLink(url) {
    if (!url) return '';
    
    try {
        let shopId = '';
        let productId = '';
        
        // Mẫu 1: shopee.vn/product-i.SHOPID.PRODUCTID hoặc shopee.vn/ten-san-pham-i.SHOPID.PRODUCTID
        const regexPattern1 = /-i\.(\d+)\.(\d+)/;
        const match1 = url.match(regexPattern1);
        if (match1) {
            shopId = match1[1];
            productId = match1[2];
        } else {
            // Mẫu 2: shopee.vn/product/SHOPID/PRODUCTID
            const regexPattern2 = /\/product\/(\d+)\/(\d+)/;
            const match2 = url.match(regexPattern2);
            if (match2) {
                shopId = match2[1];
                productId = match2[2];
            }
        }

        // Nếu bóc tách thành công, tạo cấu trúc Deep Link Shopee chính thức
        if (shopId && productId) {
            return `shopeevn://product/${shopId}/${productId}`;
        }
        
        // Fallback 1: Nếu là link Shopee nhưng không tìm thấy sản phẩm cụ thể, dẫn về trang chủ app
        if (url.includes('shopee.vn')) {
            return `shopeevn://`;
        }
        
        // Fallback 2: Trả về link gốc nếu không phải link Shopee
        return url;
    } catch (e) {
        console.error('Lỗi khi bóc tách Regex Shopee:', e);
        return url;
    }
}

// Hàm chính xử lý toàn bộ item đầu vào từ n8n
async function main() {
    const items = $input.all();
    const results = [];

    for (const item of items) {
        // Sao chép dữ liệu cũ để tránh ảnh hưởng reference gốc
        const data = { ...item.json };
        
        // Chỉ xử lý các hàng có trạng thái PENDING
        if (data.Status === 'PENDING' && data.Original_Link) {
            console.log(`Đang xử lý link: ${data.Original_Link}`);
            
            // Bước 1: Giải mã link rút gọn nếu có
            const resolvedUrl = await resolveShortLink(data.Original_Link);
            console.log(`URL sau khi giải mã: ${resolvedUrl}`);
            
            // Bước 2: Sinh Deep Link từ URL đích
            const deepLink = generateShopeeDeepLink(resolvedUrl);
            console.log(`Deep Link được tạo: ${deepLink}`);
            
            data.Deep_Link = deepLink;
        }
        
        results.push({ json: data });
    }

    return results;
}

// Thực thi hàm chính trong môi trường n8n
return await main();
