//langchain loader 是rag的基础功能 txt,pdf,excel....
import{
    PuppeteerWebBaseLoader,
}from '@langchain/community/document_loaders/web/puppeteer';
import {
  RecursiveCharacterTextSplitter,
} from 'langchain/text_splitter';
import {createOpenAI} from '@ai-sdk/openai'
import{
  embed  //向量嵌入
}from 'ai'
import{
  config
}from 'dotenv'
import{
  createClient
}from '@supabase/supabase-js'
config()

const supabase=createClient(
  process.env.SUPABASE_Url??"",
  process.env.SUPABASE_Key??""
)
const openai=createOpenAI({
  apiKey:process.env.OPENAI_API_KEY,
  baseURL:process.env.OPENAI_API_BASE_URL,
})

// supabase 去做向量化的知识库数据
console.log('开始向量化知识库数据')
const splitter=new RecursiveCharacterTextSplitter({
   chunkSize:512, //切割的长度 512 个字符  包含一个比较独立的语义
   chunkOverlap:100, //切割的重叠长度 100 个字符 一句话被切断容错
})
const scrapePage = async (url: string): Promise<string> => {
    const loader = new PuppeteerWebBaseLoader(url, {
      launchOptions: {
        executablePath: "C:\\Users\\L\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
        headless: true,
      },
      gotoOptions: {
        waitUntil: 'networkidle0',
      },
      evaluate: async(page, browser) => {
        const result = await page.evaluate(() => document.body.innerHTML);
        await browser.close();
        return result;
      }
    });
    // gm 正则修饰符
    // ^ 在[^]表示不是>的字符
    return (await loader.scrape()).replace(/<[^>]*>?/gm,"");
  }
const loadData=async(webpages:string[])=>{
   for  (const url of webpages){
      const content =await scrapePage(url);
      const chunks=await splitter.splitText(content)
      console.log(chunks,'----');
      for(let chunk of chunks){
        const {embedding}=await embed({
          model:openai.embedding('text-embedding-3-small'),
          value:chunk
        })
        console.log(embedding);
      const {error}=await supabase.from("chunks").insert({
        content:chunk,
        vector:embedding,
        url:url
      })
    }
   }
}
// 知识库的来源，可配置
loadData([
    "https://www.xiaomiev.com/ultra", // 小米su7
    // "https://www.nio.cn/ec6", // 蔚来 ec6
    // "https://www.xiaopeng.com/x9_2026.html", // 小鹏 x9
    // "https://www.lixiang.com/i8", // 理想 i8
    // "https://www.bmw.com.cn/zh/all-models/m-series/m3-touring/2025/inspire.html",// 宝马 m3
  ]);


