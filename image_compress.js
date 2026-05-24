/**
 * n8n Code Node Script: Image Path & Compression URL Generator
 * 
 * Script này chuẩn bị thông tin xử lý ảnh cho từng sản phẩm có trạng thái PENDING.
 * Để tối ưu hiệu năng của n8n và không bắt buộc cài đặt các thư viện C++ nặng nề như sharp,
 * chúng ta sử dụng dịch vụ nén ảnh CDN mã nguồn mở cực kỳ nổi tiếng và miễn phí: images.weserv.nl (được bảo trợ bởi Cloudflare).
 * 
 * Luồng hoạt động:
 * 1. Nhận URL ảnh thô (`Image_URL`) từ Google Sheets.
 * 2. Tạo tên file WebP cục bộ có dạng: `images/product_${id}.webp`.
 * 3. Tạo một URL nén ảnh thông minh qua CDN:
 *    `https://images.weserv.nl/?url=${encodeURIComponent(Image_URL)}&output=webp&q=75&w=400`
 *    URL này sẽ tự động:
 *    - Tải ảnh từ nguồn gốc
 *    - Đổi định dạng sang .webp
 *    - Cắt/Nén chất lượng xuống 75% (độ nét hoàn hảo cho mobile, kích thước chỉ ~15-25KB)
 *    - Resize chiều rộng tối đa 400px (phù hợp tuyệt đối với Grid 2 cột trên điện thoại)
 * 4. Node tiếp theo trong n8n (HTTP Request) sẽ chỉ cần fetch URL nén này dưới dạng Binary,
 *    và đẩy trực tiếp lên GitHub Pages thông qua API của GitHub dưới tên file đã định nghĩa.
 */

async function main() {
    const items = $input.all();
    const results = [];

    for (const item of items) {
        const data = { ...item.json };
        
        // Chỉ xử lý các hàng có trạng thái PENDING và có ảnh thô
        if (data.Status === 'PENDING' && data.Image_URL) {
            // Trường hợp ảnh đã là ảnh WebP tối ưu sẵn của hệ thống, bỏ qua không xử lý lại
            if (data.Image_URL.startsWith('images/product_') && data.Image_URL.endsWith('.webp')) {
                results.push({ json: data });
                continue;
            }
            
            console.log(`Đang sinh cấu trúc nén ảnh cho sản phẩm ID: ${data.ID}`);
            
            const rawImageUrl = data.Image_URL.trim();
            const productId = data.ID || Math.floor(Math.random() * 1000000);
            
            // 1. Định nghĩa tên file WebP cục bộ tương đối để lưu trữ trong thư mục images/
            const localFileName = `images/product_${productId}.webp`;
            
            // 2. Tạo URL nén ảnh thông minh qua images.weserv.nl CDN
            // Thay thế giao thức http/https thành định dạng chuẩn của weserv
            const compressUrl = `https://images.weserv.nl/?url=${encodeURIComponent(rawImageUrl)}&output=webp&q=75&w=400`;
            
            // Lưu thông tin vào object để các Node n8n tiếp theo sử dụng
            data.Temp_Compress_URL = compressUrl;
            data.Temp_Local_Path = localFileName;
            
            // Cập nhật lại Image_URL chính thức bằng đường dẫn tương đối
            // Khi lưu trên GitHub Pages, đường dẫn tương đối này giúp tải ảnh trực tiếp từ repo cực nhanh
            data.Image_URL = localFileName;
        }
        
        results.push({ json: data });
    }

    return results;
}

return await main();
