/**
 * n8n Code Node Script: Cache Builder (data.json Generator)
 * 
 * Script này gom toàn bộ sản phẩm có trạng thái "DONE" từ Google Sheets
 * và đóng gói cùng với cấu hình KOL (Tên kênh, Bio, Avatar, Link Shopee Mall)
 * để tạo thành nội dung chuỗi JSON hoàn chỉnh cho file `data.json`.
 * 
 * Luồng hoạt động trong n8n:
 * Node này nhận dữ liệu đầu vào từ hai nguồn (hoặc nhận trực tiếp danh sách sản phẩm
 * và kết hợp cấu hình KOL được cấu hình thông qua biến môi trường hoặc các hàng đặc biệt).
 * 
 * Đầu ra sẽ là một đối tượng chứa chuỗi JSON sẵn sàng để đẩy lên GitHub API.
 */

// Cấu hình KOL mặc định (nếu không được truyền động từ Google Sheets)
const DEFAULT_KOL_CONFIG = {
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Lisa",
    name: "@khanhvy.official",
    bio: "✨ Welcome to my shop! Góc chia sẻ các sản phẩm chính hãng mình đã trực tiếp trải nghiệm và review trên TikTok. Săn deal hời mỗi ngày cùng mình nhé! 👇",
    shopee_mall: "https://shopee.vn/m/shopeemall"
};

async function main() {
    // Lấy toàn bộ các item truyền vào Code Node (danh sách sản phẩm từ Google Sheets)
    const items = $input.all();
    
    const products = [];
    let kolConfig = { ...DEFAULT_KOL_CONFIG };

    for (const item of items) {
        const data = item.json;
        
        // Kiểm tra xem dòng này có phải dòng cấu hình KOL đặc biệt không (nếu KOL nhập cấu hình chung bảng)
        // Ví dụ: Một dòng có Category = "CONFIG" hoặc Title = "KOL_CONFIG"
        if (data.Category === 'CONFIG' || data.ID === -1 || data.Title === 'KOL_CONFIG') {
            kolConfig.name = data.Original_Link || kolConfig.name; // Dùng cột Original_Link lưu Tên kênh
            kolConfig.bio = data.Deep_Link || kolConfig.bio;       // Dùng cột Deep_Link lưu Bio
            kolConfig.avatar = data.Image_URL || kolConfig.avatar; // Dùng cột Image_URL lưu Avatar
            kolConfig.shopee_mall = data.Original_Link || kolConfig.shopee_mall; // Fallback link
            continue;
        }

        // Chỉ đưa vào cache các sản phẩm đã hoàn thành (DONE)
        if (data.Status === 'DONE') {
            products.push({
                ID: Number(data.ID) || Math.floor(Math.random() * 1000000),
                Category: data.Category ? data.Category.trim() : 'Sản phẩm khác',
                Title: data.Title ? data.Title.trim() : 'Sản phẩm Shopee',
                Original_Link: data.Original_Link ? data.Original_Link.trim() : '',
                Deep_Link: data.Deep_Link ? data.Deep_Link.trim() : '',
                Image_URL: data.Image_URL ? data.Image_URL.trim() : '',
                Status: 'DONE'
            });
        }
    }

    // Sắp xếp sản phẩm theo ID giảm dần (Sản phẩm mới nhất lên đầu)
    products.sort((a, b) => b.ID - a.ID);

    // Đóng gói cấu trúc dữ liệu chính thức
    const finalData = {
        config: kolConfig,
        products: products
    };

    // Chuyển đổi thành chuỗi JSON đẹp mắt để ghi file
    const jsonString = JSON.stringify(finalData, null, 2);

    // Trả về kết quả dưới dạng đối tượng n8n để chuyển sang Node GitHub / Write File
    return [{
        json: {
            file_name: "data.json",
            file_content: jsonString,
            total_products: products.length,
            generated_at: new Date().toISOString()
        }
    }];
}

return await main();
