module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if(req.method === "OPTIONS"){
    return res.status(200).end();
  }
  if(req.method !== "POST"){
    return res.status(400).json({error:"仅支持POST请求"});
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if(!apiKey){
    return res.status(500).json({error:"未配置DASHSCOPE_API_KEY"});
  }

  const {imageBase64} = req.body;
  if(!imageBase64){
    return res.status(400).json({error:"缺少图片base64数据"});
  }

  const prompt = `你处理新加坡LTA Log-Card截图。
只提取下面字段，严格输出JSON，不要任何多余文字、解释、markdown。
字段清单：
plate：车牌号
model：完整车型
color：车身颜色
transferCount：过户次数，数字，识别不到填null
arf：Actual ARF Paid金额，纯数字，严禁读取OMV
firstRegistrationDate：首次注册日期，格式YYYY-MM-DD，识别不到填null
`;

  try{
    const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${apiKey}`,
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        model:"qwen-vl-flash",
        input:{
          messages:[
            {
              role:"user",
              content:[
                {type:"text",text:prompt},
                {type:"image_url",image_url:{url:imageBase64}}
              ]
            }
          ]
        },
        parameters:{result_format:"json"}
      })
    });

    const respData = await response.json();
    if (!response.ok) {
      throw new Error(`阿里云API返回错误: ${JSON.stringify(respData)}`);
    }
    const rawText = respData.output.choices[0].message.content[0].text;
    const jsonData = JSON.parse(rawText);
    return res.status(200).json(jsonData);
  }catch(err){
    return res.status(500).json({
      error:"AI调用失败",
      detail: err.message || String(err)
    });
  }
};